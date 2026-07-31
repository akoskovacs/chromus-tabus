import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Listeners, useChromeTabs } from "./hooks/useChromeTabs";
import isEqual from "lodash.isequal";
import { TabProperties } from "./chrome-tabs";
import { useLatest } from "./hooks/useLatest";
import { usePrevious } from "./hooks/usePrevious";
import { usePersistFn } from "./hooks/usePersistFn";

export type ChromeTabProperties = TabProperties & {
  /** Optional React node rendered into the tab's favicon slot via a portal. */
  icon?: React.ReactNode;
};

export type TabsProps = Listeners & {
  tabs: ChromeTabProperties[];
  className?: string;
  darkMode?: boolean;
  pinnedRight?: React.ReactNode;
};

const CUSTOM_ICON_CLASS = "chrome-tab-has-custom-icon";

export function Tabs({
  tabs,
  className,
  darkMode,
  onTabActive: onTabActive,
  onTabClose: onTabClose,
  onTabReorder,
  onContextMenu,
  pinnedRight: toolbar,
}: TabsProps) {
  const tabsLatest = useLatest(tabs);
  const previousTabs = usePrevious(tabs);
  const [faviconEls, setFaviconEls] = useState<
    Record<string, HTMLElement | null>
  >({});

  const moveIndex = useRef({ tabId: "", fromIndex: -1, toIndex: -1 });

  const handleTabReorder = usePersistFn(
    (tabId: string, fromIndex: number, toIndex: number) => {
      const [dest] = tabsLatest.current.splice(fromIndex, 1);
      tabsLatest.current.splice(toIndex, 0, dest);
      const beforeFromIndex = moveIndex.current.fromIndex;
      moveIndex.current = {
        tabId,
        fromIndex: beforeFromIndex > -1 ? beforeFromIndex : fromIndex,
        toIndex,
      };
    }
  );

  const handleDragEnd = usePersistFn(() => {
    const { tabId, fromIndex, toIndex } = moveIndex.current;
    if (fromIndex > -1) {
      onTabReorder?.(tabId, fromIndex, toIndex);
    }
    moveIndex.current = {
      tabId: "",
      fromIndex: -1,
      toIndex: -1,
    };
  });

  const {
    ChromeTabs,
    rootRef,
    addTab,
    activeTab,
    removeTab,
    updateTab,
    updateTabByIndex,
  } = useChromeTabs({
    onTabClose: onTabClose,
    onTabActive: onTabActive,
    onContextMenu,
    onDragEnd: handleDragEnd,
    onTabReorder: handleTabReorder,
  });

  useEffect(() => {
    const beforeTabs = previousTabs || [];
    if (!isEqual(beforeTabs, tabs)) {
      const retainTabs = beforeTabs.slice(tabs.length);
      retainTabs.forEach((tab) => {
        removeTab(tab.id);
      });

      tabs.forEach((tab, index) => {
        updateTabByIndex(index, {
          ...tab,
          // Keep the favicon slot visible when a custom icon node is used,
          // otherwise updateTab() hides it
          faviconClass:
            tab.icon && !tab.favicon && !tab.faviconClass
              ? CUSTOM_ICON_CLASS
              : tab.faviconClass,
        });
      });

      tabs.forEach((tab) => {
        if (tab.active) {
          activeTab(tab.id);
        }
      });

      const root = rootRef.current;
      if (root) {
        const els: Record<string, HTMLElement | null> = {};
        tabs.forEach((tab) => {
          els[tab.id] = root.querySelector(
            `.chrome-tab[data-tab-id="${tab.id.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"] .chrome-tab-favicon`
          );
        });
        setFaviconEls(els);
      }
    }
  }, [tabs]);
  return (
    <>
      <ChromeTabs className={className} darkMode={darkMode} toolbar={toolbar} />
      {tabs.map((tab) =>
        tab.icon && faviconEls[tab.id]
          ? createPortal(tab.icon, faviconEls[tab.id]!, tab.id)
          : null
      )}
    </>
  );
}
