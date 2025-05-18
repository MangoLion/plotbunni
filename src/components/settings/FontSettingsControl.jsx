import React from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AArrowUp, AArrowDown } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';

const FontSettingsControl = () => {
  const { t } = useTranslation();
  const {
    fontFamily,
    fontSize,
    setFontFamily,
    setFontSize,
    AVAILABLE_FONTS,
  } = useSettings();

  return (
    <div className="space-y-4 p-4">
      <div>
        <Label htmlFor="fontFamilySelectPopover" className="text-sm font-medium">{t('font_settings_label_family')}</Label>
        <Select value={fontFamily} onValueChange={setFontFamily}>
          <SelectTrigger id="fontFamilySelectPopover" className="mt-1">
            <SelectValue placeholder={t('font_settings_placeholder_select_font')} />
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_FONTS.map((font) => (
              <SelectItem key={font.id} value={font.id}>
                {font.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="fontSizeControlsPopover" className="text-sm font-medium">{t('font_settings_label_base_size_px')}</Label>
        <div id="fontSizeControlsPopover" className="flex items-center gap-2 mt-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setFontSize(Math.max(8, fontSize - 1))}
            disabled={fontSize <= 8}
            title={t('font_settings_tooltip_decrease_size')}
          >
            <AArrowDown className="h-5 w-5" />
          </Button>
          <span className="text-sm w-10 text-center tabular-nums">{fontSize}px</span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setFontSize(Math.min(72, fontSize + 1))}
            disabled={fontSize >= 72}
            title={t('font_settings_tooltip_increase_size')}
          >
            <AArrowUp className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FontSettingsControl;
