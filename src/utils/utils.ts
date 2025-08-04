import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Text difference detection utility
export interface TextDifference {
  type: 'insert' | 'delete' | 'replace';
  char?: string;
  position: number;
  length?: number;
  oldChar?: string;
  newChar?: string;
}

export const findTextDifference = (oldText: string, newText: string): TextDifference | null => {
  if (newText.length > oldText.length) {
    // Text was inserted
    const insertedLength = newText.length - oldText.length;

    // Find where the insertion occurred
    let insertPos = 0;
    while (insertPos < Math.min(oldText.length, newText.length) &&
      oldText[insertPos] === newText[insertPos]) {
      insertPos++;
    }

    // Get the inserted text
    const insertedText = newText.substring(insertPos, insertPos + insertedLength);

    return {
      type: 'insert',
      char: insertedText,
      position: insertPos
    };
  } else if (newText.length < oldText.length) {
    // Text was deleted
    const deletedLength = oldText.length - newText.length;

    // Find where the deletion occurred
    let deletePos = 0;
    while (deletePos < Math.min(oldText.length, newText.length) &&
      oldText[deletePos] === newText[deletePos]) {
      deletePos++;
    }

    return {
      type: 'delete',
      position: deletePos,
      length: deletedLength
    };
  } else if (oldText !== newText) {
    // Text was replaced (same length but different content)
    let replacePos = 0;
    while (replacePos < oldText.length && oldText[replacePos] === newText[replacePos]) {
      replacePos++;
    }

    const oldChar = oldText[replacePos];
    const newChar = newText[replacePos];

    return {
      type: 'replace',
      position: replacePos,
      oldChar,
      newChar
    };
  }

  return null;
};

// Text position calculation utility
export const getTextPosition = (node: Node, offset: number, editorRef?: React.RefObject<HTMLDivElement | null>): number => {
  if (node.nodeType === Node.TEXT_NODE) {
    return offset;
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    let textOffset = 0;
    const walker = document.createTreeWalker(
      node,
      NodeFilter.SHOW_TEXT,
      null
    );

    let currentNode;
    while (currentNode = walker.nextNode()) {
      if (currentNode === node) {
        break;
      }
      textOffset += currentNode.textContent?.length || 0;
    }

    return textOffset + offset;
  }

  // Fallback: try to get position from the editor
  if (editorRef?.current) {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(editorRef.current);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      return preCaretRange.toString().length;
    }
  }

  return offset;
}; 