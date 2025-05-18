import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/context/SettingsContext'; // Added
import pdfMake from "pdfmake/build/pdfmake"; // Added for npm import
import pdfFonts from "pdfmake/build/vfs_fonts"; // Added for npm import
import JSZip from 'jszip'; // Added for ZIP export

// Configure pdfmake to use the VFS for fonts.
// Based on the error "pdfFonts.pdfMake is undefined", pdfFonts itself is the VFS.
pdfMake.vfs = pdfFonts;


export const ExportModal = ({ isOpen, onClose, novelData, isDataLoaded }) => {
  const { t } = useTranslation();
  const [exportFormat, setExportFormat] = useState('markdown'); // 'markdown', 'txt', 'pdf', or 'zip'
  const [includeToc, setIncludeToc] = useState(true);
  const [showActSceneNames, setShowActSceneNames] = useState(true);
  const { toast } = useToast();
  const { fontSize } = useSettings(); // Removed fontFamily and AVAILABLE_FONTS, as we'll default to Roboto for PDF

  // const getSelectedFontName = () => {
  //   const font = AVAILABLE_FONTS.find(f => f.id === fontFamily);
  //   return font ? font.name : 'Roboto'; // Default to Roboto if not found
  // };

  const downloadFile = ({ data, fileName, fileType }) => {
    const blob = new Blob([data], { type: fileType });
    const a = document.createElement('a');
    a.download = fileName;
    a.href = window.URL.createObjectURL(blob);
    const clickEvt = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true,
    });
    a.dispatchEvent(clickEvt);
    a.remove();
    window.URL.revokeObjectURL(a.href); // Clean up
  };

  const generateContent = () => {
    if (!isDataLoaded || !novelData || !novelData.novelName || !novelData.acts || !novelData.chapters || !novelData.scenes || !novelData.actOrder) {
      toast({ title: t('export_modal_toast_error_title'), description: t('export_modal_toast_error_data_missing_desc'), variant: "destructive" });
      return null;
    }

    const { novelName, authorName, synopsis, acts, chapters, scenes, actOrder } = novelData;
    let content = "";
    const isMarkdown = exportFormat === 'markdown';

    // Title and Author
    if (isMarkdown) {
      content += `# ${novelName || t('export_modal_content_untitled_novel')}\n\n`;
      if (authorName) {
        content += `## ${t('export_modal_content_by_author', { authorName })}\n\n`;
      }
    } else { // txt
      content += `${novelName || t('export_modal_content_untitled_novel')}\n`;
      if (authorName) {
        content += `${t('export_modal_content_by_author', { authorName })}\n`;
      }
      content += "\n";
    }

    // Synopsis
    if (synopsis) {
      if (isMarkdown) {
        content += `### ${t('export_modal_content_synopsis_heading')}\n\n${synopsis}\n\n`;
      } else { // txt
        content += `${t('export_modal_content_synopsis_heading')}:\n${synopsis}\n\n`;
      }
    }
    
    // Table of Contents
    if (includeToc) {
      if (isMarkdown) {
        content += `## ${t('export_modal_content_toc_heading')}\n\n`;
      } else { // txt
        content += `${t('export_modal_content_toc_heading')}\n-----------------\n`;
      }
      actOrder.forEach(actId => {
        const act = acts[actId];
        if (act) {
          if (isMarkdown) {
            content += `- ${showActSceneNames ? (act.name || t('export_modal_content_unnamed_act')) : t('export_modal_act_placeholder')}\n`;
          } else { // txt
            content += `  ${showActSceneNames ? (act.name || t('export_modal_content_unnamed_act')) : t('export_modal_act_placeholder')}\n`;
          }
          (act.chapterOrder || []).forEach(chapterId => {
            const chapter = chapters[chapterId];
            if (chapter) {
              if (isMarkdown) {
                content += `  - ${showActSceneNames ? (chapter.name || t('export_modal_content_unnamed_chapter')) : t('export_modal_chapter_placeholder')}\n`;
              } else { // txt
                content += `    ${showActSceneNames ? (chapter.name || t('export_modal_content_unnamed_chapter')) : t('export_modal_chapter_placeholder')}\n`;
              }
              if (showActSceneNames) {
                (chapter.sceneOrder || []).forEach(sceneId => {
                    const scene = scenes[sceneId];
                    if(scene) {
                        if (isMarkdown) {
                            content += `    - ${scene.name || t('export_modal_content_unnamed_scene')}\n`;
                        } else { // txt
                            content += `      ${scene.name || t('export_modal_content_unnamed_scene')}\n`;
                        }
                    }
                });
              }
            }
          });
        }
      });
      content += "\n";
    }

    // Main Content
    actOrder.forEach(actId => {
      const act = acts[actId];
      if (act) {
        if (showActSceneNames) {
          if (isMarkdown) {
            content += `## ${act.name || t('export_modal_content_unnamed_act')}\n\n`;
          } else { // txt
            content += `${act.name || t('export_modal_content_unnamed_act')}\n==================\n\n`;
          }
        }
        (act.chapterOrder || []).forEach(chapterId => {
          const chapter = chapters[chapterId];
          if (chapter) {
            if (showActSceneNames) {
              if (isMarkdown) {
                content += `### ${chapter.name || t('export_modal_content_unnamed_chapter')}\n\n`;
              } else { // txt
                content += `${chapter.name || t('export_modal_content_unnamed_chapter')}\n------------------\n\n`;
              }
            }
            (chapter.sceneOrder || []).forEach(sceneId => {
              const scene = scenes[sceneId];
              if (scene) {
                if (showActSceneNames) {
                  if (isMarkdown) {
                    content += `#### ${scene.name || t('export_modal_content_unnamed_scene')}\n\n`;
                  } else { // txt
                    content += `${scene.name || t('export_modal_content_unnamed_scene')}\n\n`;
                  }
                }
                if (scene.content) {
                  content += `${scene.content}\n\n`;
                } else if (isMarkdown) {
                  content += `${t('export_modal_content_no_scene_content_md')}\n\n`;
                } else { // txt
                  content += `${t('export_modal_content_no_scene_content_txt')}\n\n`;
                }
              }
            });
          }
        });
      }
    });
    return content;
  };

  const generatePdfDocDefinition = () => {
    if (!isDataLoaded || !novelData || !novelData.novelName || !novelData.acts || !novelData.chapters || !novelData.scenes || !novelData.actOrder) {
      toast({ title: t('export_modal_toast_error_title'), description: t('export_modal_toast_error_data_missing_desc'), variant: "destructive" });
      return null;
    }
    // pdfMake is now imported, so no need for typeof pdfMake === 'undefined' check here.
    // It will throw an error during import if not found, or pdfMake.createPdf will fail if not initialized.

    const { novelName, authorName, synopsis, acts, chapters, scenes, actOrder } = novelData;
    const selectedFont = 'Roboto'; // Always use Roboto for PDF to avoid font definition issues
    const baseFontSize = fontSize || 12;

    const content = [];

    // Cover Page
    content.push({ text: novelName || t('export_modal_content_untitled_novel'), style: 'coverTitle' });
    if (authorName) {
      content.push({ text: t('export_modal_content_by_author', { authorName }), style: 'coverSubtitle' });
    }
    content.push({ text: '', pageBreak: 'after' });

    // Table of Contents
    if (includeToc) {
      const tocContent = {
        toc: {
          title: { text: t('export_modal_content_toc_heading'), style: 'tocTitle' }
        }
      };
      content.push(tocContent);
      content.push({ text: '', pageBreak: 'after' });
    }
    
    // Synopsis (after ToC, before first chapter)
    if (synopsis) {
        content.push({ text: t('export_modal_content_synopsis_heading'), style: 'synopsisHeading', pageBreak: 'before' });
        content.push({ text: synopsis, style: 'paragraph' });
        content.push({ text: '', pageBreak: 'after' });
    }


    // Main Content
    actOrder.forEach(actId => {
      const act = acts[actId];
      if (act) {
        if (showActSceneNames) {
          content.push({ text: act.name || t('export_modal_content_unnamed_act'), style: 'actHeading', tocItem: includeToc, pageBreak: 'before' });
        }
        (act.chapterOrder || []).forEach(chapterId => {
          const chapter = chapters[chapterId];
          if (chapter) {
            if (showActSceneNames) {
              content.push({ text: chapter.name || t('export_modal_content_unnamed_chapter'), style: 'chapterHeading', tocItem: includeToc });
            }
            (chapter.sceneOrder || []).forEach(sceneId => {
              const scene = scenes[sceneId];
              if (scene) {
                if (showActSceneNames) {
                  content.push({ text: scene.name || t('export_modal_content_unnamed_scene'), style: 'sceneHeading', tocItem: includeToc });
                }
                if (scene.content) {
                  content.push({ text: scene.content, style: 'paragraph' });
                } else {
                  content.push({ text: t('export_modal_content_no_scene_content_txt'), style: 'paragraph', italics: true });
                }
              }
            });
          }
        });
      }
    });

    return {
      info: {
        title: novelName || t('export_modal_content_untitled_novel'),
        author: authorName || t('export_modal_pdf_unknown_author'),
      },
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      content: content,
      styles: {
        coverTitle: { fontSize: baseFontSize + 14, bold: true, alignment: 'center', margin: [0, 200, 0, 20] },
        coverSubtitle: { fontSize: baseFontSize + 6, italics: true, alignment: 'center', margin: [0, 0, 0, 100] },
        tocTitle: { fontSize: baseFontSize + 10, bold: true, alignment: 'center', margin: [0, 0, 0, 20] },
        synopsisHeading: { fontSize: baseFontSize + 6, bold: true, margin: [0, 20, 0, 10] },
        actHeading: { fontSize: baseFontSize + 8, bold: true, margin: [0, 20, 0, 10] },
        chapterHeading: { fontSize: baseFontSize + 6, bold: true, margin: [0, 15, 0, 8] },
        sceneHeading: { fontSize: baseFontSize + 4, bold: true, margin: [0, 10, 0, 5] },
        sceneSynopsisLabel: { fontSize: baseFontSize, bold: true, margin: [0, 5, 0, 2] },
        sceneSynopsisText: { fontSize: baseFontSize, italics: true, margin: [0, 0, 0, 10] },
        paragraph: { fontSize: baseFontSize, margin: [0, 0, 0, 10], alignment: 'justify', lineHeight: 1.3 },
      },
      defaultStyle: {
        font: selectedFont, // Use font name from settings
        fontSize: baseFontSize,
      }
    };
  };

  const generateZipFile = async () => {
    if (!isDataLoaded || !novelData || !novelData.novelName || !novelData.acts || !novelData.chapters || !novelData.scenes || !novelData.actOrder) {
      toast({ title: t('export_modal_toast_error_title'), description: t('export_modal_toast_error_data_missing_desc'), variant: "destructive" });
      return;
    }

    const zip = new JSZip();
    const { novelName, authorName, synopsis, acts, chapters, scenes, actOrder } = novelData;
    const novelFolder = zip.folder(novelName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'novel');

    // Create metadata.md for Pandoc
    let metadataContent = "---\n";
    metadataContent += `title: ${novelName || t('export_modal_content_untitled_novel')}\n`;
    if (authorName) {
      metadataContent += `author: ${authorName}\n`;
    }
    if (synopsis) {
      // Basic sanitization for YAML: escape colons, quotes
      const sanitizedSynopsis = synopsis.replace(/:/g, '\\:').replace(/"/g, '\\"').replace(/'/g, "''");
      metadataContent += `abstract: |\n  ${sanitizedSynopsis.split('\n').join('\n  ')}\n`;
    }
    metadataContent += "---\n\n";
    if (includeToc) {
        metadataContent += `# ${t('export_modal_content_toc_heading')}\n\n`;
        actOrder.forEach(actId => {
            const act = acts[actId];
            if (act) {
                metadataContent += `- ${showActSceneNames ? (act.name || t('export_modal_content_unnamed_act')) : t('export_modal_act_placeholder')}\n`;
                (act.chapterOrder || []).forEach(chapterId => {
                    const chapter = chapters[chapterId];
                    if (chapter) {
                        metadataContent += `  - ${showActSceneNames ? (chapter.name || t('export_modal_content_unnamed_chapter')) : t('export_modal_chapter_placeholder')}\n`;
                         if (showActSceneNames) {
                            (chapter.sceneOrder || []).forEach(sceneId => {
                                const scene = scenes[sceneId];
                                if(scene) {
                                    metadataContent += `    - ${scene.name || t('export_modal_content_unnamed_scene')}\n`;
                                }
                            });
                        }
                    }
                });
            }
        });
        metadataContent += "\n";
    }


    novelFolder.file("metadata.md", metadataContent);

    let chapterIndex = 1;
    actOrder.forEach(actId => {
      const act = acts[actId];
      if (act) {
        (act.chapterOrder || []).forEach(chapterId => {
          const chapter = chapters[chapterId];
          if (chapter) {
            let chapterContent = "";
            if (showActSceneNames) {
              chapterContent += `# ${chapter.name || t('export_modal_content_unnamed_chapter')}\n\n`;
            }
            (chapter.sceneOrder || []).forEach(sceneId => {
              const scene = scenes[sceneId];
              if (scene) {
                if (showActSceneNames) {
                  chapterContent += `## ${scene.name || t('export_modal_content_unnamed_scene')}\n\n`;
                }
                if (scene.content) {
                  chapterContent += `${scene.content}\n\n`;
                } else {
                  chapterContent += `${t('export_modal_content_no_scene_content_md')}\n\n`;
                }
              }
            });
            // Sanitize chapter name for filename
            const safeChapterName = (chapter.name || t('export_modal_content_unnamed_chapter')).replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const chapterFileName = `${String(chapterIndex).padStart(2, '0')}-${safeChapterName}.md`;
            novelFolder.file(chapterFileName, chapterContent);
            chapterIndex++;
          }
        });
      }
    });

    try {
      const zipBlob = await novelFolder.generateAsync({ type: "blob" });
      downloadFile({
        data: zipBlob,
        fileName: `${novelName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'novel'}.zip`,
        fileType: 'application/zip',
      });
      toast({ title: t('export_modal_toast_exported_title'), description: t('export_modal_toast_zip_exported_desc') });
      onClose();
    } catch (error) {
      console.error("Error generating ZIP:", error);
      toast({ title: t('export_modal_toast_zip_error_title'), description: t('export_modal_toast_zip_error_desc'), variant: "destructive" });
    }
  };

  const handleExport = async () => {
    if (exportFormat === 'pdf') {
      const docDefinition = generatePdfDocDefinition();
      if (docDefinition) {
        try {
          pdfMake.createPdf(docDefinition).download(`${novelData.novelName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'novel'}.pdf`);
          toast({ title: t('export_modal_toast_exported_title'), description: t('export_modal_toast_pdf_exported_desc') });
          onClose();
        } catch (error) {
          console.error("Error generating PDF:", error);
          toast({ title: t('export_modal_toast_pdf_error_title'), description: t('export_modal_toast_pdf_error_desc'), variant: "destructive" });
        }
      }
      return;
    }

    if (exportFormat === 'zip') {
      await generateZipFile();
      return;
    }

    // Handle Markdown and TXT
    const content = generateContent(); // This is for md/txt
    if (!content) return;

    const fileExtension = exportFormat === 'markdown' ? 'md' : 'txt';
    const fileType = exportFormat === 'markdown' ? 'text/markdown' : 'text/plain';
    const fileName = `${novelData.novelName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'novel'}.${fileExtension}`;
    
    downloadFile({
      data: content,
      fileName,
      fileType,
    });
    toast({ title: t('export_modal_toast_exported_title'), description: t('export_modal_toast_file_downloaded_desc', { fileName }) });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('export_modal_dialog_title')}</DialogTitle>
          <DialogDescription>
            {t('export_modal_dialog_description')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="exportFormat" className="text-right col-span-1">
              {t('export_modal_label_format')}
            </Label>
            <RadioGroup
              id="exportFormat"
              defaultValue="markdown"
              value={exportFormat}
              onValueChange={setExportFormat}
              className="col-span-3 flex flex-col space-y-2" // Changed to flex-col and space-y-2
            >
              <div className="flex items-center space-x-2"> {/* Ensured space-x-2 for item and label */}
                <RadioGroupItem value="markdown" id="r_markdown" />
                <Label htmlFor="r_markdown">{t('export_modal_radio_label_markdown')}</Label>
              </div>
              <div className="flex items-center space-x-2"> {/* Ensured space-x-2 for item and label */}
                <RadioGroupItem value="txt" id="r_txt" />
                <Label htmlFor="r_txt">{t('export_modal_radio_label_text')}</Label>
              </div>
              <div className="flex items-center space-x-2"> {/* Ensured space-x-2 for item and label */}
                <RadioGroupItem value="pdf" id="r_pdf" />
                <Label htmlFor="r_pdf">{t('export_modal_radio_label_pdf')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="zip" id="r_zip" />
                <Label htmlFor="r_zip">{t('export_modal_radio_label_zip')}</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center space-x-2 col-span-4 mt-4"> {/* Added a bit more top margin for separation */}
            <Checkbox 
              id="includeToc" 
              checked={includeToc} 
              onCheckedChange={setIncludeToc}
            />
            <Label htmlFor="includeToc" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {t('export_modal_checkbox_label_include_toc')}
            </Label>
          </div>
          <div className="flex items-center space-x-2 col-span-4">
            <Checkbox 
              id="showActSceneNames" 
              checked={showActSceneNames} 
              onCheckedChange={setShowActSceneNames}
            />
            <Label htmlFor="showActSceneNames" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {t('export_modal_checkbox_label_show_headings')}
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={handleExport} disabled={!isDataLoaded}>{t('export_modal_button_export')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
