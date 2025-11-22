import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, computed, effect, inject, PLATFORM_ID, signal } from '@angular/core';
import { $t } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

@Component({
  selector: 'theme-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card flex justify-end p-2 mb-4">
      <!-- <button 
        type="button" 
        class="inline-flex w-8 h-8 p-0 items-center justify-center surface-0 
               dark:surface-800 border border-surface-200 dark:border-surface-600 rounded"
        (click)="toggleTheme()"
      >
        <i [ngClass]="'pi ' + iconClass()" class="dark:text-white"></i>
      </button> -->
    </div>
  `
})
export class ThemeSwitcher {

  private readonly STORAGE_KEY = 'themeSwitcherState';

  document = inject(DOCUMENT);
  platformId = inject(PLATFORM_ID);

  themeState = signal({
    darkTheme: false
  });

  iconClass = computed(() =>
    this.themeState().darkTheme ? 'pi-sun' : 'pi-moon'
  );

  constructor() {
    // load state
    const saved = this.loadThemeState();
    this.themeState.set(saved);

    // init Prime theme (Aura)
    if (isPlatformBrowser(this.platformId)) {
      $t()
        .preset(Aura)
        .use({
          useDefaultOptions: true
        });
    }

    // apply mode
    this.applyTheme(saved.darkTheme);

    // auto-save
    effect(() => {
      this.saveThemeState(this.themeState());
    });
  }

  toggleTheme() {
    this.themeState.update(s => ({ darkTheme: !s.darkTheme }));
    this.applyTheme(this.themeState().darkTheme);
  }

  applyTheme(isDark: boolean) {
    if (!isPlatformBrowser(this.platformId)) return;

    const root = this.document.documentElement;

    if (isDark) root.classList.add('p-dark');
    else root.classList.remove('p-dark');
  }

  loadThemeState() {
    const data = isPlatformBrowser(this.platformId)
      ? localStorage.getItem(this.STORAGE_KEY)
      : null;

    return data ? JSON.parse(data) : { darkTheme: false };
  }

  saveThemeState(state: any) {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
  }
}
