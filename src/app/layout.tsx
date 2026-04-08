import { AuthProvider } from '@/components/AuthProvider';
import { DataProvider } from '@/components/DataContext';
import { MainLayout } from '@/components/MainLayout';
import { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'SEAS · Gestão de Obras',
  description: 'Gestão de Obras e Infraestrutura',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&family=Source+Sans+3:wght@300;400;500;600&family=Source+Code+Pro:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthProvider>
          <DataProvider>
            <MainLayout>
              {children}
            </MainLayout>
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
