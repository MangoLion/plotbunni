import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../context/SettingsContext';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { ChevronsUpDown } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";

// Helper to convert HSL string to an HSL object
const parseHslString = (hslString) => {
  if (!hslString || typeof hslString !== 'string') return { h: 0, s: 0, l: 0 };
  const [h, s, l] = hslString.match(/\d+(\.\d+)?%?/g) || ['0', '0%', '0%'];
  return {
    h: parseFloat(h),
    s: parseFloat(s),
    l: parseFloat(l),
  };
};

// Helper to format HSL object {h, s, l} to "H S% L%" string
const formatHslToString = (hslObject) => {
  const h = ((Number(hslObject.h) % 360) + 360) % 360; // Normalize hue to 0-360
  const s = Math.max(0, Math.min(100, Number(hslObject.s)));
  const l = Math.max(0, Math.min(100, Number(hslObject.l)));
  // Using toFixed(1) for precision, matching potential input like "96.1%"
  return `${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%`;
};

// Convert HSL object {h, s, l} (s, l are 0-100) to Hex string
const hslToHex = (hsl) => {
  let { h, s, l } = hsl; // h, s, l are numbers (s, l are 0-100)
  s /= 100;
  l /= 100;

  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

  const toHexChannel = x => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHexChannel(f(0))}${toHexChannel(f(8))}${toHexChannel(f(4))}`;
};

// Convert Hex string to HSL object {h, s, l} (s, l are 0-100)
const hexToHsl = (hex) => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) { // #RGB format
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) { // #RRGGBB format
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }

  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, sValue, lValue = (max + min) / 2;

  if (max === min) {
    h = sValue = 0; // achromatic
  } else {
    const d = max - min;
    sValue = lValue > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: h = 0; // Should not happen
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(sValue * 100),
    l: Math.round(lValue * 100),
  };
};

// Component to display small color swatches
const ThemeColorSwatches = ({ colors }) => {
  const { t } = useTranslation();
  const swatchColors = [
    colors?.['primary'] || '0 0% 50%', // Default to gray if not found
    colors?.['secondary'] || '0 0% 60%',
    colors?.['accent'] || '0 0% 70%',
    colors?.['background'] || '0 0% 80%',
  ];

  return (
    <div className="flex space-x-1 mr-2">
      {swatchColors.map((hslString, index) => {
        const { h, s, l } = parseHslString(hslString);
        const colorName = Object.keys(colors || {}).find(key => colors[key] === hslString);
        const titleText = colorName 
          ? `${formatVariableName(colorName)}: ${hslString}` 
          : `${t('theme_editor_color_swatch_title', { index: index + 1 })}: ${hslString}`;
        return (
          <div
            key={index}
            className="w-3 h-3 rounded-sm border border-neutral-400"
            style={{ backgroundColor: `hsl(${h} ${s}% ${l}%)` }}
            title={titleText}
          />
        );
      })}
    </div>
  );
};


// Helper to generate a display name from a CSS variable name
const formatVariableName = (varName) => {
  return varName
    .replace(/-/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
};

const ColorEditorRow = ({ mode, variableName, hslValue, onUpdateColor }) => {
  const { t } = useTranslation();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Ensure hslValue is a string before parsing, default to a safe value if not.
  const safeHslValue = typeof hslValue === 'string' ? hslValue : '0 0% 0%';
  const currentHslObject = parseHslString(safeHslValue);
  const currentHex = hslToHex(currentHslObject);

  const handleColorPickerChange = (newHex) => {
    const newHslObject = hexToHsl(newHex);
    const newHslString = formatHslToString(newHslObject);
    onUpdateColor(mode, variableName, newHslString);
  };

  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 items-center mb-2">
      <div className="flex items-center col-span-1">
        <div
          className="w-4 h-4 rounded-sm border border-neutral-400 mr-2 shrink-0"
          style={{ backgroundColor: `hsl(${currentHslObject.h} ${currentHslObject.s}% ${currentHslObject.l}%)` }}
          title={`${formatVariableName(variableName)}: ${safeHslValue}`}
        />
        <Label htmlFor={`${mode}-${variableName}-picker`} className="text-sm whitespace-nowrap">
          {formatVariableName(variableName)}
        </Label>
      </div>
      
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full h-8 justify-start text-left font-normal px-2"
            id={`${mode}-${variableName}-picker`}
          >
            <div className="flex items-center">
              <div
                className="w-3 h-3 rounded-sm border border-neutral-400 mr-2 shrink-0"
                style={{ backgroundColor: currentHex }}
              />
              <span className="text-xs truncate flex-grow">{safeHslValue}</span>
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <HexColorPicker color={currentHex} onChange={handleColorPickerChange} />
          <div className="p-2 border-t text-xs text-muted-foreground bg-background">
            <p>{t('theme_editor_hex_label')} {currentHex}</p>
            <p>{t('theme_editor_hsl_label')} {safeHslValue}</p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

const ThemeCustomizationSection = ({ mode, title }) => {
  const { t } = useTranslation();
  const {
    getAvailablePresets,
    applyPreset,
    resetThemeToDefault,
    getCurrentColors,
    updateUserColor,
    getActivePresetId, // Add this
  } = useSettings();

  const [isColorsOpen, setIsColorsOpen] = useState(false);
  const currentPresetId = getActivePresetId(mode); // Get the current preset ID

  const presets = getAvailablePresets(mode);
  const currentColors = getCurrentColors(mode);

  if (!currentColors) {
    return <p>{t('theme_editor_loading_colors')}</p>;
  }

  const colorVariables = Object.keys(currentColors);

  const handlePresetChange = (presetId) => {
    if (presetId) {
      applyPreset(mode, presetId);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{t('theme_editor_customize_section_description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Label htmlFor={`${mode}-preset-select`} className="block mb-1 text-sm font-medium">{t('theme_editor_select_preset_label')}</Label>
          <Select onValueChange={handlePresetChange} value={currentPresetId}> {/* Add value prop */}
            <SelectTrigger id={`${mode}-preset-select`} className="w-full">
              <SelectValue placeholder={t('theme_editor_select_preset_placeholder', { mode: mode })} />
            </SelectTrigger>
            <SelectContent>
              {presets.map(preset => (
                <SelectItem key={preset.id} value={preset.id}>
                  <div className="flex items-center">
                    <ThemeColorSwatches colors={preset.colors} />
                    <span>{preset.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Collapsible
          open={isColorsOpen}
          onOpenChange={setIsColorsOpen}
          className="border rounded-md p-2 mb-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">{t('theme_editor_edit_hsl_title')}</h4>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="p-0 h-8 w-8">
                <ChevronsUpDown className="h-4 w-4" />
                <span className="sr-only">{t('theme_editor_toggle_color_editor_sr')}</span>
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="mt-2">
            <p className="text-xs text-muted-foreground mb-2" dangerouslySetInnerHTML={{ __html: t('theme_editor_hsl_format_instruction') }} />
            <div className="max-h-[300px] overflow-y-auto pr-2">
              {colorVariables.map(varName => (
                <ColorEditorRow
                  key={`${mode}-${varName}`}
                  mode={mode}
                  variableName={varName}
                  hslValue={currentColors[varName]}
                  onUpdateColor={updateUserColor}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Button variant="outline" size="sm" onClick={() => resetThemeToDefault(mode)}>
          {t('theme_editor_reset_to_default_button')}
        </Button>
      </CardContent>
    </Card>
  );
};

export const ThemeEditor = () => {
  const { t } = useTranslation();
  const { themeMode, setThemeMode } = useSettings();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('theme_editor_main_title')}</CardTitle>
          <CardDescription>{t('theme_editor_main_description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Label htmlFor="theme-mode-select" className="block mb-1 text-sm font-medium">{t('theme_editor_theme_mode_label')}</Label>
            <Select value={themeMode} onValueChange={setThemeMode}>
              <SelectTrigger id="theme-mode-select" className="w-full md:w-1/2">
                <SelectValue placeholder={t('theme_editor_select_theme_mode_placeholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">{t('theme_editor_light_mode_option')}</SelectItem>
                <SelectItem value="dark">{t('theme_editor_dark_mode_option')}</SelectItem>
                <SelectItem value="system">{t('theme_editor_system_mode_option')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ThemeCustomizationSection mode="light" title={t('theme_editor_light_theme_title')} />
            <ThemeCustomizationSection mode="dark" title={t('theme_editor_dark_theme_title')} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
