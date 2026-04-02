import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, X, Zap, Heart, Info } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { Switch } from '@/components/ui/switch';
import { AIHordeModelBrowserModal } from './AIHordeModelBrowserModal';

const AIHordeSettingsSection = () => {
  const { t } = useTranslation();
  const { aiHordeSettings, updateAiHordeSettings } = useSettings();
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);

  const { apiKey, useCommunityKey, selectedModelId, selectedModelName, contextLength, maxOutputTokens, useGlobally } = aiHordeSettings;
  const hasModel = !!selectedModelId;

  const formatTokens = (n) => {
    if (!n) return '—';
    if (n >= 1000) return `${Math.round(n / 1000)}k`;
    return String(n);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <CardTitle>{t('ai_horde_section_title')}</CardTitle>
          </div>
          <CardDescription>{t('ai_horde_section_description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {!useGlobally && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-3 rounded-md text-sm flex items-start gap-2 mb-2">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <p>{t('ai_horde_not_enabled_warning')}</p>
            </div>
          )}
          {/* Community Key Toggle */}
          <div className="flex items-center justify-between space-x-2 py-2">
            <Label htmlFor="use-community-key" className="flex flex-col space-y-1">
              <span>{t('ai_horde_use_community_key_label', 'Use Developer Shared Key')}</span>
              <span className="font-normal leading-snug text-muted-foreground text-xs">
                {t('ai_horde_use_community_key_description', 'Enables a shared key for the community, providing some kudos for faster generation.')}
              </span>
            </Label>
            <Switch
              id="use-community-key"
              checked={!!useCommunityKey}
              onCheckedChange={(checked) => updateAiHordeSettings({ useCommunityKey: checked })}
            />
          </div>

          {/* API Key */}
          <div className="space-y-1">
            <Label htmlFor="horde-api-key">{t('ai_horde_api_key_label')}</Label>
            <div className="relative">
              <Input
                id="horde-api-key"
                type="password"
                placeholder={useCommunityKey ? "Using Developer Shared Key" : t('ai_horde_api_key_placeholder')}
                value={useCommunityKey ? (import.meta.env.VITE_AIHORDE_KEY || "") : apiKey}
                onChange={e => updateAiHordeSettings({ apiKey: e.target.value })}
                className="max-w-sm"
                disabled={useCommunityKey}
              />
              {useCommunityKey && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-primary opacity-70" title="Community Key Active">
                  <Heart className="h-4 w-4 fill-current" />
                </div>
              )}
            </div>
            {!useCommunityKey && <p className="text-xs text-muted-foreground">{t('ai_horde_api_key_help')}</p>}
            {useCommunityKey && (
              <p className="text-xs text-primary font-medium flex items-center gap-1">
                <Info className="h-3 w-3" />
                {t('ai_horde_community_key_active_help', "Using developer's shared key! Hopefully there is some kudos left.")}
              </p>
            )}
          </div>

          {/* Selected Model */}
          <div className="space-y-2">
            <Label>{t('ai_horde_selected_model_label')}</Label>
            {hasModel ? (
              <div className="flex flex-wrap items-center gap-4 p-3 rounded-md border bg-muted/40">
                <span className="font-medium text-sm break-all">{selectedModelName || selectedModelId}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs">
                    {t('ai_horde_context_label', { context: formatTokens(contextLength) })}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {t('ai_horde_output_label', { output: formatTokens(maxOutputTokens) })}
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('ai_horde_no_model_selected')}</p>
            )}
            <div className="flex gap-2">
              <Button variant="default" onClick={() => setIsBrowserOpen(true)} className="gap-2">
                <Search className="h-4 w-4" />
                {t('ai_horde_browse_models_button')}
              </Button>
              {hasModel && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateAiHordeSettings({ selectedModelId: null, selectedModelName: null })}
                  className="gap-1 text-muted-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                  {t('ai_horde_clear_model_button')}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AIHordeModelBrowserModal
        isOpen={isBrowserOpen}
        onClose={() => setIsBrowserOpen(false)}
      />
    </>
  );
};

export default AIHordeSettingsSection;
