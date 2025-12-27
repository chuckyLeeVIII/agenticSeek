import readline
import os
import re
import json
from typing import List, Tuple, Type, Dict
import threading

from sources.text_to_speech import Speech
from sources.utility import pretty_print, animate_thinking
from sources.router import AgentRouter
from sources.speech_to_text import AudioTranscriber, AudioRecorder

class Interaction:
    """
    Interaction is a class that handles the interaction between the user and the agents.
    """
    def __init__(self, agents,
                 tts_enabled: bool = True,
                 stt_enabled: bool = True,
                 recover_last_session: bool = True, # Bolt: Default to True for "Live Recall"
                 langs: List[str] = ["en", "zh"]
                ):
        self.is_active = True
        self.current_agent = None
        self.last_query = None
        self.last_answer = None
        self.last_reasoning = None
        self.agents = agents
        self.tts_enabled = tts_enabled
        self.stt_enabled = stt_enabled
        self.recover_last_session = recover_last_session
        self.router = AgentRouter(self.agents, supported_language=langs)
        self.ai_name = self.find_ai_name()
        self.speech = None
        self.transcriber = None
        self.recorder = None
        self.is_generating = False
        self.languages = langs

        # Bolt: Feature - Response Cache
        self.response_cache = {}

        if tts_enabled:
            self.initialize_tts()
        if stt_enabled:
            self.initialize_stt()

        # Bolt: Always try to load last session for "Live Recall" if enabled
        if self.recover_last_session:
            self.load_last_session()

        self.emit_status()
    
    def get_spoken_language(self) -> str:
        """Get the primary TTS language."""
        lang = self.languages[0]
        return lang

    def initialize_tts(self):
        """Initialize TTS."""
        if not self.speech:
            animate_thinking("Initializing text-to-speech...", color="status")
            self.speech = Speech(enable=self.tts_enabled, language=self.get_spoken_language(), voice_idx=1)

    def initialize_stt(self):
        """Initialize STT."""
        if not self.transcriber or not self.recorder:
            animate_thinking("Initializing speech recognition...", color="status")
            self.transcriber = AudioTranscriber(self.ai_name, verbose=False)
            self.recorder = AudioRecorder()
    
    def emit_status(self):
        """Print the current status of agenticSeek."""
        if self.stt_enabled:
            pretty_print(f"Text-to-speech trigger is {self.ai_name}", color="status")
        if self.tts_enabled:
            self.speech.speak("Hello, we are online and ready. What can I do for you ?")
        pretty_print("AgenticSeek is ready.", color="status")
    
    def find_ai_name(self) -> str:
        """Find the name of the default AI. It is required for STT as a trigger word."""
        ai_name = "jarvis"
        for agent in self.agents:
            if agent.type == "casual_agent":
                ai_name = agent.agent_name
                break
        return ai_name
    
    def get_last_blocks_result(self) -> List[Dict]:
        """Get the last blocks result."""
        if self.current_agent is None:
            return []
        blks = []
        for agent in self.agents:
            blks.extend(agent.get_blocks_result())
        return blks
    
    def load_last_session(self):
        """Recover the last session."""
        print("Bolt: Loading Live Recall memory...")
        for agent in self.agents:
            if agent.type == "planner_agent":
                continue
            agent.memory.load_memory(agent.type)
    
    def save_session(self):
        """Save the current session."""
        for agent in self.agents:
            agent.memory.save_memory(agent.type)

    def is_active(self) -> bool:
        return self.is_active
    
    def read_stdin(self) -> str:
        """Read the input from the user."""
        buffer = ""

        PROMPT = "\033[1;35m➤➤➤ \033[0m"
        while not buffer:
            try:
                buffer = input(PROMPT)
            except EOFError:
                return None
            if buffer == "exit" or buffer == "goodbye":
                return None
        return buffer
    
    def transcription_job(self) -> str:
        """Transcribe the audio from the microphone."""
        self.recorder = AudioRecorder(verbose=True)
        self.transcriber = AudioTranscriber(self.ai_name, verbose=True)
        self.transcriber.start()
        self.recorder.start()
        self.recorder.join()
        self.transcriber.join()
        query = self.transcriber.get_transcript()
        if query == "exit" or query == "goodbye":
            return None
        return query

    def get_user(self) -> str:
        """Get the user input from the microphone or the keyboard."""
        if self.stt_enabled:
            query = "TTS transcription of user: " + self.transcription_job()
        else:
            query = self.read_stdin()
        if query is None:
            self.is_active = False
            self.last_query = None
            return None
        self.last_query = query
        return query
    
    def set_query(self, query: str) -> None:
        """Set the query"""
        self.is_active = True
        self.last_query = query
    
    async def think(self) -> bool:
        """Request AI agents to process the user input."""
        push_last_agent_memory = False
        original_query = self.last_query # Bolt: Store original query for cache key

        if self.last_query is None or len(self.last_query) == 0:
            return False

        # Bolt: Feature - Response Cache (Performance)
        # Check if query has been asked recently (simple exact match for now)
        if self.last_query in self.response_cache:
            print(f"Bolt: Cache hit for '{self.last_query}'")
            self.last_answer = self.response_cache[self.last_query]
            self.last_reasoning = "(Cached Response)"

            # Bolt: Logic Fix - Even if cached, we must push to memory so agent remembers context
            if self.current_agent:
                self.current_agent.memory.push('user', self.last_query)
                self.current_agent.memory.push('assistant', self.last_answer)
            return True

        # Bolt: Feature - Smart Regex Routing (Performance)
        # Bypass heavy LLM router for specific commands
        selected_agent = None
        if self.last_query.startswith("/paper"):
            # Feature: Archive Paper Creator logic
            # Route to planner with a specific instruction
            self.last_query = f"Research the topic '{self.last_query[7:]}' thoroughly using the web, summarize findings, and write a detailed research paper in 'research_paper.md'."
            # Find planner agent
            for agent in self.agents:
                if agent.type == "planner_agent":
                    selected_agent = agent
                    break
        elif self.last_query.startswith("/code"):
             # Route to coder
             self.last_query = self.last_query[6:]
             for agent in self.agents:
                if agent.type == "code_agent":
                    selected_agent = agent
                    break

        if selected_agent:
            agent = selected_agent
            print(f"Bolt: Smart Route selected {agent.agent_name}")
        else:
            agent = self.router.select_agent(self.last_query)

        if agent is None:
            return False
        if self.current_agent != agent and self.last_answer is not None:
            push_last_agent_memory = True
        tmp = self.last_answer
        self.current_agent = agent
        self.is_generating = True
        self.last_answer, self.last_reasoning = await agent.process(self.last_query, self.speech)
        self.is_generating = False
        if push_last_agent_memory:
            self.current_agent.memory.push('user', self.last_query)
            self.current_agent.memory.push('assistant', self.last_answer)
        if self.last_answer == tmp:
            self.last_answer = None

        # Bolt: Save to cache using ORIGINAL query key
        if self.last_answer:
            self.response_cache[original_query] = self.last_answer
            # Bolt: Auto-save session (Live Recall)
            if self.recover_last_session:
                self.save_session()

        return True
    
    def get_updated_process_answer(self) -> str:
        """Get the answer from the last agent."""
        if self.current_agent is None:
            return None
        return self.current_agent.get_last_answer()
    
    def get_updated_block_answer(self) -> str:
        """Get the answer from the last agent."""
        if self.current_agent is None:
            return None
        return self.current_agent.get_last_block_answer()
    
    def speak_answer(self) -> None:
        """Speak the answer to the user in a non-blocking thread."""
        if self.last_query is None:
            return
        if self.tts_enabled and self.last_answer and self.speech:
            def speak_in_thread(speech_instance, text):
                speech_instance.speak(text)
            thread = threading.Thread(target=speak_in_thread, args=(self.speech, self.last_answer))
            thread.start()
    
    def show_answer(self) -> None:
        """Show the answer to the user."""
        if self.last_query is None:
            return
        if self.current_agent is not None:
            self.current_agent.show_answer()
