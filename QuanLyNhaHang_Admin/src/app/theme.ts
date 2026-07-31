import Chart, { type Plugin } from 'chart.js/auto';

export const APP_THEME_CHANGE_EVENT = 'app-theme-change';
export type AppTheme = 'light' | 'dark';

export interface AppChartThemeColors {
  text: string;
  mutedText: string;
  grid: string;
  surface: string;
  tooltipBackground: string;
  tooltipBorder: string;
}

export function getAppChartThemeColors(documentRef: Document = document): AppChartThemeColors {
  const styles = getComputedStyle(documentRef.documentElement);

  return {
    text: styles.getPropertyValue('--app-text').trim(),
    mutedText: styles.getPropertyValue('--app-text-muted').trim(),
    grid: styles.getPropertyValue('--app-chart-grid').trim(),
    surface: styles.getPropertyValue('--app-surface').trim(),
    tooltipBackground: styles.getPropertyValue('--app-chart-tooltip').trim(),
    tooltipBorder: styles.getPropertyValue('--app-chart-tooltip-border').trim()
  };
}

function applyColorsToChart(chart: Chart): void {
  const colors = getAppChartThemeColors(chart.canvas.ownerDocument);
  const options = chart.options as any;

  options.color = colors.text;

  if (options.plugins?.legend?.labels) {
    options.plugins.legend.labels.color = colors.text;
  }

  if (options.plugins?.tooltip) {
    options.plugins.tooltip.backgroundColor = colors.tooltipBackground;
    options.plugins.tooltip.titleColor = colors.text;
    options.plugins.tooltip.bodyColor = colors.text;
    options.plugins.tooltip.borderColor = colors.tooltipBorder;
  }

  Object.values(options.scales ?? {}).forEach((scale: any) => {
    if (scale.grid) scale.grid.color = colors.grid;
    if (scale.ticks) scale.ticks.color = colors.mutedText;
    if (scale.title) scale.title.color = colors.text;
  });

  const chartType = (chart.config as any).type;

  if (chartType === 'doughnut' || chartType === 'pie') {
    chart.data.datasets.forEach(dataset => {
      dataset.borderColor = colors.surface;
    });
  }
}

const appThemeChartPlugin: Plugin = {
  id: 'appThemeColors',
  beforeUpdate: applyColorsToChart
};

Chart.register(appThemeChartPlugin);

export function refreshAppCharts(documentRef: Document): void {
  const colors = getAppChartThemeColors(documentRef);
  Chart.defaults.color = colors.mutedText;
  Chart.defaults.borderColor = colors.grid;

  Object.values(Chart.instances).forEach(chart => {
    applyColorsToChart(chart);
    chart.update('none');
  });
}
