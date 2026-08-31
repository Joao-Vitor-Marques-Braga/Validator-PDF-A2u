import React from 'react';
import {
  ShieldCheck,
  FileCheck2,
  Lock,
  Sun,
  Moon,
} from 'lucide-react';
import { PdfValidatorWidget } from './features/pdf-validator';
import { useTheme } from './shared/hooks/useTheme';
import styles from './App.module.css';

export const App: React.FC = () => {
  const { toggleTheme, isDark } = useTheme();

  return (
    <div className={styles.appContainer}>
      {/* Top Navigation Bar */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.brand}>
            <div className={styles.brandIcon}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className={styles.brandTitle}>PDF/A-2u Guard</span>
                <span className={styles.brandBadge}>v1.0 Strict</span>
              </div>
            </div>
          </div>

          <div className={styles.headerActions}>
            <div className={styles.headerTags}>
              <div className={styles.tag}>
                <Lock size={14} color="var(--success-text)" />
                <span>100% Client-Side</span>
              </div>
              <div className={styles.tag}>
                <FileCheck2 size={14} color="var(--accent-primary)" />
                <span>ISO 19005-2 Conformance U</span>
              </div>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className={styles.themeToggleBtn}
              title={isDark ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
              aria-label={isDark ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'}
            >
              {isDark ? (
                <>
                  <Sun size={15} color="#fbbf24" />
                  <span>Modo Claro</span>
                </>
              ) : (
                <>
                  <Moon size={15} color="#6366f1" />
                  <span>Modo Escuro</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className={styles.mainContent}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <h1 className={styles.heroTitle}>Validador Estrito de PDF/A-2u</h1>
        </section>

        {/* Feature Component */}
        <PdfValidatorWidget />
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>
          Validador PDF/A-2u • Desenvolvido com React 18, TypeScript, Vite & Clean Architecture.
        </p>
      </footer>
    </div>
  );
};

export default App;
