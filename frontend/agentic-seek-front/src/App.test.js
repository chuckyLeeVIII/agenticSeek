import { render, screen, act } from '@testing-library/react';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';

// Mock react-markdown
jest.mock('react-markdown', () => (props) => {
  return <div data-testid="markdown">{props.children}</div>;
});

// Mock axios
jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({ data: {} })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
}));

test('renders AgenticSeek header', async () => {
  await act(async () => {
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>
    );
  });
  const headerElement = screen.getByText(/AgenticSeek/i);
  expect(headerElement).toBeInTheDocument();
});
