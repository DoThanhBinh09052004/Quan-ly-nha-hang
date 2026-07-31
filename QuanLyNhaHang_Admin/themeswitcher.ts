import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, computed, effect, inject, PLATFORM_ID, signal } from '@angular/core';
import {
  APP_THEME_CHANGE_EVENT,
  type AppTheme,
  refreshAppCharts
} from './src/app/theme';

@Component({
  selector: 'theme-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      type="button"
      class="theme-toggle"
      [attr.aria-label]="buttonLabel()"
      [attr.title]="buttonLabel()"
      [attr.aria-pressed]="themeState().darkTheme"
      (click)="toggleTheme()"
    >
      <i [ngClass]="'pi ' + iconClass()" aria-hidden="true"></i>
      <span class="theme-toggle__label">{{ themeLabel() }}</span>
    </button>
  `,
  styles: `
    :host {
      position: fixed;
      top: 12px;
      right: 16px;
      z-index: 1200;
    }

    .theme-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 40px;
      padding: 0 14px;
      border: 1px solid var(--app-border);
      border-radius: 999px;
      background: var(--app-surface);
      color: var(--app-text);
      box-shadow: var(--app-shadow-sm);
      cursor: pointer;
      transition:
        transform var(--app-transition),
        background-color var(--app-transition),
        border-color var(--app-transition),
        color var(--app-transition);
    }

    .theme-toggle:hover {
      transform: translateY(-1px);
      border-color: #60a5fa;
      background: var(--app-surface-hover);
    }

    .theme-toggle:focus-visible {
      outline: 3px solid rgba(96, 165, 250, 0.35);
      outline-offset: 2px;
    }

    .theme-toggle i {
      color: #3b82f6;
      font-size: 1rem;
    }

    .theme-toggle__label {
      font-size: 0.8rem;
      font-weight: 700;
      white-space: nowrap;
    }

    @media (max-width: 900px) {
      :host {
        top: 10px;
        right: 10px;
      }

      .theme-toggle {
        width: 40px;
        padding: 0;
      }

      .theme-toggle__label {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
    }
  `
})
export class ThemeSwitcher {

  private readonly STORAGE_KEY = 'themeSwitcherState';

  document = inject(DOCUMENT);
  platformId = inject(PLATFORM_ID);

  themeState = signal({
    darkTheme: true
  });

  iconClass = computed(() =>
    this.themeState().darkTheme ? 'pi-sun' : 'pi-moon'
  );

  themeLabel = computed(() =>
    this.themeState().darkTheme ? 'Chế độ sáng' : 'Chế độ tối'
  );

  buttonLabel = computed(() =>
    this.themeState().darkTheme
      ? 'Chuyển sang chế độ sáng'
      : 'Chuyển sang chế độ tối'
  );

  constructor() {
    const saved = this.loadThemeState();
    this.themeState.set(saved);

    effect(() => {
      const state = this.themeState();
      this.applyTheme(state.darkTheme);
      this.saveThemeState(state);
    });
  }

  toggleTheme() {
    this.themeState.update(s => ({ darkTheme: !s.darkTheme }));
  }

  applyTheme(isDark: boolean) {
    if (!isPlatformBrowser(this.platformId)) return;

    const root = this.document.documentElement;

    root.classList.toggle('p-dark', isDark);
    root.dataset['theme'] = isDark ? 'dark' : 'light';
    root.style.colorScheme = isDark ? 'dark' : 'light';
    refreshAppCharts(this.document);

    this.document.dispatchEvent(new CustomEvent(APP_THEME_CHANGE_EVENT, {
      detail: { theme: (isDark ? 'dark' : 'light') satisfies AppTheme }
    }));
  }

  loadThemeState(): { darkTheme: boolean } {
    const data = isPlatformBrowser(this.platformId)
      ? localStorage.getItem(this.STORAGE_KEY)
      : null;

    if (!data) return { darkTheme: true };

    try {
      const parsed = JSON.parse(data);
      return typeof parsed?.darkTheme === 'boolean'
        ? { darkTheme: parsed.darkTheme }
        : { darkTheme: true };
    } catch {
      return { darkTheme: true };
    }
  }

  saveThemeState(state: { darkTheme: boolean }) {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
  }
}
