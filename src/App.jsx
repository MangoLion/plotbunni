import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useData } from './context/DataContext.jsx';
import { useSettings } from './context/SettingsContext.jsx';
import { getAllNovelMetadata } from '@/lib/indexedDb.js'; // Import for fetching novel name
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import ConceptCacheList from '@/components/concept/ConceptCacheList.jsx';
import NovelOverviewTab from '@/components/novel/NovelOverviewTab.jsx'; // Import new component
import PlanView from '@/components/plan/PlanView.jsx';
import SettingsView from '@/components/settings/SettingsView.jsx';
import WriteView from '@/components/write/WriteView.jsx';
import { Link } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, Rabbit, Home, Clipboard, Edit, Settings, BookOpen, Lightbulb, Sun, Moon, Text } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import FontSettingsControl from '@/components/settings/FontSettingsControl';

// App component now represents the Novel Editor for a specific novel
function App({ novelId }) { // novelId is passed as a prop from NovelEditorLayout
  const { t } = useTranslation();
  // useData() will now get data for the specific novelId via context
  const { isDataLoaded, currentNovelId } = useData();
  const [activeMainTab, setActiveMainTab] = useState("plan");
  const [activeSidebarTab, setActiveSidebarTab] = useState("overview"); // New state for sidebar tabs
  const [currentNovelName, setCurrentNovelName] = useState(t('novel_editor_default_novel_name')); // State for novel name
  const [targetChapterId, setTargetChapterId] = useState(null); // State for scrolling target
  const [targetSceneId, setTargetSceneId] = useState(null); // State for specific scene scrolling
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // State for sidebar collapse
  const sidebarPanelRef = useRef(null); // Ref for the sidebar ResizablePanel

  const SIDEBAR_PANEL_ID = "sidebar-panel";

  // Get theme settings from context
  const { themeMode, activeOsTheme, setThemeMode } = useSettings();

  const toggleSidebar = () => {
    if (sidebarPanelRef.current) {
      if (isSidebarCollapsed) {
        sidebarPanelRef.current.expand();
      } else {
        sidebarPanelRef.current.collapse();
      }
      // The onCollapse/onExpand callbacks on ResizablePanel will update isSidebarCollapsed state
    }
  };

  useEffect(() => {
    if (novelId) {
      const fetchNovelName = async () => {
        try {
          const allMeta = await getAllNovelMetadata();
          const currentMeta = allMeta.find(m => m.id === novelId);
          if (currentMeta) {
            setCurrentNovelName(currentMeta.name);
          } else {
            setCurrentNovelName(t('novel_editor_novel_not_found')); // Or some other appropriate fallback
          }
        } catch (error) {
          console.error("Failed to fetch novel name:", error);
          setCurrentNovelName(t('novel_editor_default_novel_name')); // Fallback on error
        }
      };
      fetchNovelName();
    } else {
      setCurrentNovelName(t('novel_editor_default_novel_name')); // Default if no novelId
    }
  }, [novelId, t]); // Depend only on novelId prop and t

  useEffect(() => {
    // Set the default tab for mobile to "overview"
    // Tailwind's 'md' breakpoint is 768px.
    // We consider anything less than that as mobile for this logic.
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      setActiveMainTab("overview");
    }
    // On desktop, the default "plan" (from useState) is appropriate for the main content area,
    // as "overview" is in the sidebar.
  }, []); // Empty dependency array ensures this runs only once on mount

  // Determine the effective theme for the toggle button display
  const effectiveTheme = themeMode === 'system' ? activeOsTheme : themeMode;

  // Toggle between explicit light and dark modes
  const handleThemeToggle = () => {
    const nextTheme = effectiveTheme === 'light' ? 'dark' : 'light';
    setThemeMode(nextTheme); // Use the context function to set the mode
  };

  // Handler to switch to Write tab and set target chapter and scene
  const handleSwitchToWriteTab = (chapterId, sceneId = null) => {
    setActiveMainTab('write');
    setTargetChapterId(chapterId);
    setTargetSceneId(sceneId);
    // Reset targets after a short delay to allow WriteView to process them
    // This prevents re-scrolling if the user switches back and forth quickly
    // without clicking a new chapter/scene's write button.
    setTimeout(() => {
      setTargetChapterId(null);
      setTargetSceneId(null);
    }, 100);
  };

  // Show loading state if data for the current novelId is not yet loaded
  // or if the novelId from props doesn't match the one in context (mid-transition)
  if (!isDataLoaded || currentNovelId !== novelId) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-background">
        <Rabbit className="h-12 w-12 animate-pulse text-primary mb-4" />
        <p className="text-xl text-muted-foreground">{t('novel_editor_loading_data')}</p>
        {novelId && <p className="text-sm text-muted-foreground mt-1">{t('novel_editor_novel_id_label', { novelId })}</p>}
      </div>
    );
  }

  const renderRightPaneContent = () => {
    switch (activeMainTab) {
      case "write":
        // Pass targetChapterId and targetSceneId to WriteView
        return <WriteView targetChapterId={targetChapterId} targetSceneId={targetSceneId} />;
      case "plan":
        // Pass the handler and novelId down to PlanView
        return <PlanView onSwitchToWriteTab={handleSwitchToWriteTab} novelId={novelId} />;
      case "settings":
        return <SettingsView />; // SettingsView will consume data from useData()
      default:
        return <PlanView onSwitchToWriteTab={handleSwitchToWriteTab} novelId={novelId} />; // Default to Plan view
    }
  };

  const renderMobileContent = () => {
    switch (activeMainTab) {
      case "overview":
        return <NovelOverviewTab />;
      case "concepts":
        return <ConceptCacheList />;
      case "write":
        // Pass targetChapterId and targetSceneId to WriteView for mobile too
        return <WriteView targetChapterId={targetChapterId} targetSceneId={targetSceneId} />;
      case "plan":
        // Pass the handler and novelId down to PlanView for mobile too
        return <PlanView onSwitchToWriteTab={handleSwitchToWriteTab} novelId={novelId} />;
      case "settings":
        return <SettingsView />;
      default:
        return <PlanView onSwitchToWriteTab={handleSwitchToWriteTab} novelId={novelId} />; // Default to Plan on mobile
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="flex items-center justify-between p-3 border-b bg-background shadow-sm print:hidden">
        <div className="flex items-center min-w-0"> {/* Left side items: Home, Novel Name, Tabs */}
          <Link to="/" className="p-2 rounded-md hover:bg-muted mr-2 flex-shrink-0" title={t('back_to_novels')}>
            <Home className="h-5 w-5 text-foreground" />
          </Link>

          {/* Sidebar Toggle Button (Desktop Only, shows when sidebar is collapsed) */}
          {isSidebarCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="hidden md:flex mr-2 flex-shrink-0"
              title={t('novel_editor_show_sidebar_tooltip')}
            >
              <PanelLeftOpen className="h-5 w-5" />
            </Button>
          )}
          
          <h1 className="text-xl font-bold truncate min-w-0 max-w-[300px] flex items-center">
            <span className="truncate">{currentNovelName || t('app_title')}</span>
            <Rabbit className="h-5 w-5 ml-2 flex-shrink-0 mr-2" /> {/* Bunny Icon next to novel name */}
          </h1>
          
          <Tabs
            value={activeMainTab}
            onValueChange={setActiveMainTab}
            className="w-auto ml-4 flex-shrink-0" /* Tabs next to novel name */
          >
            <TabsList className="justify-start">
              {/* Mobile-only tabs - icon only */}
              <TabsTrigger value="overview" className="md:hidden p-2" title={t('novel_editor_overview_tab')}>
                <BookOpen className="h-5 w-5" />
              </TabsTrigger>
              <TabsTrigger value="concepts" className="md:hidden p-2" title={t('novel_editor_concepts_tab_mobile_tooltip')} data-joyride="concepts-tab">
                <Lightbulb className="h-5 w-5" />
              </TabsTrigger>

              {/* Tabs visible on all sizes, icon-only on mobile, icon + text on md+ */}
              <TabsTrigger value="plan" className="text-sm md:text-base p-2 md:px-4 md:py-2" title={t('novel_editor_plan_tab')} data-joyride="plan-tab">
                <Clipboard className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">{t('novel_editor_plan_tab')}</span>
              </TabsTrigger>
              <TabsTrigger value="write" className="text-sm md:text-base p-2 md:px-4 md:py-2" title={t('novel_editor_write_tab')} data-joyride="write-tab">
                <Edit className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">{t('novel_editor_write_tab')}</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-sm md:text-base p-2 md:px-4 md:py-2" title={t('novel_editor_settings_tab')} data-joyride="settings-tab">
                <Settings className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">{t('novel_editor_settings_tab')}</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center"> {/* Right side items: Font Settings Popover, Theme Toggle */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="ml-2" title={t('novel_editor_font_settings_tooltip')}>
                <Text className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" side="bottom" align="end">
              <FontSettingsControl />
            </PopoverContent>
          </Popover>

          <Button variant="ghost" size="icon" onClick={handleThemeToggle} className="ml-2" title={effectiveTheme === 'light' ? t('theme_toggle_tooltip_light') : t('theme_toggle_tooltip_dark')}>
            {effectiveTheme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Desktop: Resizable Two-Pane Layout */}
      <div className="hidden md:flex flex-grow border-t">
        <ResizablePanelGroup 
          direction="horizontal" 
          className="flex-grow"
        >
          <ResizablePanel
            id={SIDEBAR_PANEL_ID}
            ref={sidebarPanelRef} // Assign ref to the panel
            defaultSize={30}
            minSize={15} // Smallest draggable size
            maxSize={50}
            collapsible={true}
            collapsedSize={0} // Size when programmatically collapsed
            onCollapse={() => setIsSidebarCollapsed(true)}
            onExpand={() => setIsSidebarCollapsed(false)}
            className="transition-all duration-200 ease-in-out" // Smooth transition for collapse/expand
          >
            {!isSidebarCollapsed && ( // Conditionally render content
              <div className="flex flex-col h-full">
                <Tabs value={activeSidebarTab} onValueChange={setActiveSidebarTab} className="flex flex-col h-full">
                  {/* This div wraps TabsList and the new button */}
                  <div className="flex items-center shrink-0 border-b"> {/* Parent for TabsList and Button */}
                    <TabsList className="shrink-0 rounded-none flex-grow">
                      <TabsTrigger value="overview" className="flex-1 rounded-none">
                        <BookOpen className="mr-2 h-4 w-4" />{t('novel_editor_overview_tab')}
                      </TabsTrigger>
                      <TabsTrigger value="concepts" className="flex-1 rounded-none" data-joyride="concepts-tab-desktop"> {/* Unique for desktop */}
                        <Lightbulb className="mr-2 h-4 w-4" />{t('novel_editor_concept_cache_tab')}
                      </TabsTrigger>
                    </TabsList>
                    {/* New Button (Hide Sidebar) */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleSidebar}
                      className="hidden md:flex mx-1 flex-shrink-0" // Desktop only, with horizontal margin
                      title={t('novel_editor_hide_sidebar_tooltip')}
                    >
                      <PanelLeftClose className="h-5 w-5" />
                    </Button>
                  </div>
                  
                  {/* Use absolute positioning for TabsContent to ensure they take full height */}
                  <div className="relative flex-grow">
                    <TabsContent 
                      value="overview" 
                      className="absolute inset-0 p-0 m-0"
                      forceMount={activeSidebarTab === "overview"}
                    >
                      <NovelOverviewTab />
                    </TabsContent>
                    
                    <TabsContent 
                      value="concepts" 
                      className="absolute inset-0 p-0 m-0"
                      forceMount={activeSidebarTab === "concepts"}
                    >
                      <ConceptCacheList />
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            )}
          </ResizablePanel>
          <ResizableHandle withHandle className={isSidebarCollapsed ? "hidden" : ""} /> {/* Hide handle when collapsed */}
          <ResizablePanel defaultSize={70} className="flex flex-col h-full"> {/* This panel will expand to fill space */}
            <ScrollArea className="h-full">
              {renderRightPaneContent()}
            </ScrollArea>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile: Single Pane Layout */}
      <div className="md:hidden flex-grow border-t">
        <ScrollArea className="h-full">
          {renderMobileContent()}
        </ScrollArea>
      </div>
    </div>
  );
}

export default App;
