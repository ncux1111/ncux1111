import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { normalizeUiText } from '../utils/textEncoding';

const TEXT_ATTRIBUTES = ['placeholder', 'title', 'aria-label'] as const;

function repairTextNode(node: Node) {
  const originalText = node.textContent;
  if (!originalText) return;

  const fixedText = normalizeUiText(originalText);
  if (fixedText !== originalText) {
    node.textContent = fixedText;
  }
}

function repairElementAttributes(element: Element) {
  TEXT_ATTRIBUTES.forEach((attribute) => {
    const originalValue = element.getAttribute(attribute);
    if (!originalValue) return;

    const fixedValue = normalizeUiText(originalValue);
    if (fixedValue !== originalValue) {
      element.setAttribute(attribute, fixedValue);
    }
  });
}

function repairSubtree(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) {
    repairTextNode(root);
    return;
  }

  if (root.nodeType === Node.ELEMENT_NODE) {
    repairElementAttributes(root as Element);
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ALL);
  let current = walker.currentNode;

  while (current) {
    if (current.nodeType === Node.TEXT_NODE) {
      repairTextNode(current);
    } else if (current.nodeType === Node.ELEMENT_NODE) {
      repairElementAttributes(current as Element);
    }

    current = walker.nextNode();
  }
}

export function UiEncodingGuard() {
  const location = useLocation();

  useEffect(() => {
    if (typeof document === 'undefined') return;

    let frameId = 0;
    let delayedRepairTimer = 0;

    const runRepair = () => {
      repairSubtree(document.body);
      document.title = normalizeUiText(document.title);
    };

    frameId = requestAnimationFrame(runRepair);
    delayedRepairTimer = window.setTimeout(runRepair, 320);

    return () => {
      window.clearTimeout(delayedRepairTimer);
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [location.pathname, location.search]);

  return null;
}
