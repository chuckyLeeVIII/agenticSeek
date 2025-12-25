import React, { useState, useRef, useCallback } from "react";
import "./ResizableLayout.css";

export const ResizableLayout = ({
  children,
  initialLeftWidth = 50,
  leftWidth: controlledLeftWidth,
  onWidthChange,
}) => {
  const [internalLeftWidth, setInternalLeftWidth] = useState(initialLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const leftWidth =
    controlledLeftWidth !== undefined ? controlledLeftWidth : internalLeftWidth;
  const setLeftWidth = onWidthChange || setInternalLeftWidth;

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newLeftWidth =
        ((e.clientX - containerRect.left) / containerRect.width) * 100;

      // Constrain between 20% and 80%
      const constrainedWidth = Math.max(20, Math.min(80, newLeftWidth));
      setLeftWidth(constrainedWidth);
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      className={`resizable-container ${isDragging ? "dragging" : ""}`}
    >
      <div className="resizable-left" style={{ width: `${leftWidth}%` }}>
        {children[0]}
      </div>
      <div className="resize-handle" onMouseDown={handleMouseDown}>
        <div className="resize-handle-line" />
      </div>
      <div className="resizable-right" style={{ width: `${100 - leftWidth}%` }}>
        {children[1]}
      </div>
    </div>
  );
};
