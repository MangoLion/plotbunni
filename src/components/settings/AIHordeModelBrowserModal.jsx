import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { fetchHordeModels } from '@/lib/aiHordeUtils';
import { useSettings } from '@/context/SettingsContext';

const SORT_OPTIONS = [
  { value: 'workers', label: 'Workers' },
  { value: 'context', label: 'Context Length' },
  { value: 'output', label: 'Max Output' },
  { value: 'performance', label: 'Performance' },
  { value: 'queue', label: 'Queue (low first)' },
];

export const AIHordeModelBrowserModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { aiHordeSettings, updateAiHordeSettings } = useSettings();

  const [models, setModels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('workers');
  const [minWorkers, setMinWorkers] = useState(1);

  const loadModels = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchHordeModels();
      setModels(data);
    } catch (err) {
      setError(err.message || 'Failed to load models');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && models.length === 0 && !isLoading) {
      loadModels();
    }
  }, [isOpen]);

  const filteredModels = useMemo(() => {
    let result = models.filter(m => {
      if (m.workerCount < minWorkers) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!m.cleanName.toLowerCase().includes(q) && !m.id.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'context': return b.maxContextLength - a.maxContextLength;
        case 'output': return b.maxOutputTokens - a.maxOutputTokens;
        case 'performance': return b.performance - a.performance;
        case 'queue': return a.queued - b.queued; // ascending: least busy first
        case 'workers':
        default: return b.workerCount - a.workerCount;
      }
    });

    return result;
  }, [models, search, sortBy, minWorkers]);

  const handleSelect = (model) => {
    updateAiHordeSettings({
      selectedModelId: model.id,
      selectedModelName: model.cleanName,
      contextLength: model.maxContextLength || 4096,
      maxOutputTokens: model.maxOutputTokens || 512,
    });
    onClose();
  };

  const formatNumber = (n) => {
    if (!n) return '—';
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}m`;
    if (n >= 1000) return `${Math.round(n / 1000)}k`;
    return String(Math.round(n));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('ai_horde_model_browser_title')}</DialogTitle>
          <DialogDescription>{t('ai_horde_model_browser_description')}</DialogDescription>
        </DialogHeader>

        {/* Controls */}
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[160px]">
            <Label className="text-xs mb-1 block">{t('ai_horde_model_browser_search_label')}</Label>
            <Input
              placeholder={t('ai_horde_model_browser_search_placeholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="w-36">
            <Label className="text-xs mb-1 block">{t('ai_horde_model_browser_sort_by')}</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-28">
            <Label className="text-xs mb-1 block">{t('ai_horde_min_workers_filter')}</Label>
            <Input
              type="number"
              min={0}
              value={minWorkers}
              onChange={e => setMinWorkers(Math.max(0, parseInt(e.target.value) || 0))}
              className="h-8"
            />
          </div>
          <Button variant="outline" size="sm" onClick={loadModels} disabled={isLoading} className="h-8 gap-1">
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {t('ai_horde_model_browser_refresh')}
          </Button>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-x-3 px-3 py-1.5 text-xs font-medium text-muted-foreground border-b">
          <span>{t('ai_horde_model_browser_col_model')}</span>
          <span className="text-right w-12">{t('ai_horde_model_browser_col_size')}</span>
          <span className="text-right w-14">{t('ai_horde_model_browser_col_workers')}</span>
          <span className="text-right w-14">{t('ai_horde_model_browser_col_queue')}</span>
          <span className="text-right w-16">{t('ai_horde_model_browser_col_context')}</span>
          <span className="text-right w-16">{t('ai_horde_model_browser_col_max_output')}</span>
          <span className="text-right w-14">{t('ai_horde_model_browser_col_performance')}</span>
        </div>

        {/* Model list */}
        <ScrollArea className="flex-1 min-h-0">
          {isLoading && (
            <div className="space-y-2 p-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          )}

          {!isLoading && error && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={loadModels}>{t('ai_horde_model_browser_retry')}</Button>
            </div>
          )}

          {!isLoading && !error && filteredModels.length === 0 && (
            <p className="text-center text-muted-foreground py-12 text-sm">{t('ai_horde_model_browser_no_models')}</p>
          )}

          {!isLoading && !error && filteredModels.map(model => {
            const isSelected = aiHordeSettings.selectedModelId === model.id;
            return (
              <button
                key={model.id}
                onClick={() => handleSelect(model)}
                className={`w-full grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-x-3 items-center px-3 py-2 text-sm rounded-md transition-colors hover:bg-accent hover:text-accent-foreground text-left
                  ${isSelected ? 'bg-primary/10 ring-1 ring-primary' : ''}`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />}
                  <span className="truncate font-medium" title={model.id}>{model.cleanName}</span>
                  {model.backend && (
                    <Badge variant="outline" className="text-xs py-0 px-1 hidden sm:inline-flex shrink-0">
                      {model.backend}
                    </Badge>
                  )}
                  {model.quant && model.quant !== 'full' && (
                    <Badge variant="secondary" className="text-xs py-0 px-1 hidden sm:inline-flex shrink-0">
                      {model.quant}
                    </Badge>
                  )}
                </span>
                <span className="text-right w-12 text-muted-foreground">
                  {model.size ? `${model.size}B` : '—'}
                </span>
                <span className="text-right w-14 tabular-nums">
                  {model.workerCount}
                </span>
                <span className={`text-right w-14 tabular-nums ${model.queued > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                  {formatNumber(model.queued)}
                </span>
                <span className="text-right w-16 tabular-nums text-muted-foreground">
                  {formatNumber(model.maxContextLength)}
                </span>
                <span className="text-right w-16 tabular-nums text-muted-foreground">
                  {formatNumber(model.maxOutputTokens)}
                </span>
                <span className="text-right w-14 tabular-nums text-muted-foreground">
                  {model.performance ? model.performance.toFixed(1) : '—'}
                </span>
              </button>
            );
          })}
        </ScrollArea>

        <p className="text-xs text-muted-foreground text-right">
          {!isLoading && !error && `${filteredModels.length} ${t('ai_horde_model_browser_models_shown')}`}
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default AIHordeModelBrowserModal;
