"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  HiHome, 
  HiUsers, 
  HiSpeakerphone, 
  HiChartPie, 
  HiCog, 
  HiPaperAirplane,
  HiPencil,
  HiPlus,
  HiDocumentReport
} from 'react-icons/hi';
import { useState } from 'react';

interface SidebarLinkProps {
  href: string;
  children: React.ReactNode;
  icon: React.ReactNode;
}

interface SidebarLinkWithSubMenuProps extends SidebarLinkProps {
  subMenuItems: {
    href: string;
    label: string;
    icon: React.ReactNode;
  }[];
}

export default function Sidebar() {
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['/campanhas']);
  
  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const toggleSubMenu = (path: string) => {
    setExpandedMenus(prev => 
      prev.includes(path) 
        ? prev.filter(item => item !== path) 
        : [...prev, path]
    );
  };

  const SidebarLink = ({ href, children, icon }: SidebarLinkProps) => {
    const active = isActive(href);
    return (
      <Link
        href={href}
        className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
          active
            ? 'bg-blue-500 text-white'
            : 'text-gray-600 hover:bg-blue-100 hover:text-blue-600'
        }`}
      >
        <span className="text-xl">{icon}</span>
        <span className="font-medium">{children}</span>
      </Link>
    );
  };

  const SidebarLinkWithSubMenu = ({ href, children, icon, subMenuItems }: SidebarLinkWithSubMenuProps) => {
    const active = isActive(href);
    const isExpanded = expandedMenus.includes(href);
    
    return (
      <div>
        <button
          onClick={() => toggleSubMenu(href)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
            active
              ? 'bg-blue-500 text-white'
              : 'text-gray-600 hover:bg-blue-100 hover:text-blue-600'
          }`}
        >
          <div className="flex items-center space-x-3">
            <span className="text-xl">{icon}</span>
            <span className="font-medium">{children}</span>
          </div>
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isExpanded && (
          <div className="pl-10 mt-1 space-y-1">
            {subMenuItems.map((item, index) => (
              <Link
                key={index}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive(item.href)
                    ? 'bg-blue-100 text-blue-600'
                    : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-64 bg-white h-screen shadow-lg fixed left-0 top-0 overflow-y-auto">
      <div className="p-5">
        <div className="flex items-center space-x-2 mb-8">
          <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
            <HiPaperAirplane className="h-6 w-6 text-white transform rotate-45" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-blue-600">PromoBot</h1>
            <p className="text-xs text-gray-500">Gerenciador de Campanhas</p>
          </div>
        </div>

        <nav className="space-y-2">
          <SidebarLink href="/dashboard" icon={<HiHome />}>
            Dashboard
          </SidebarLink>
          <SidebarLink href="/contatos" icon={<HiUsers />}>
            Contatos
          </SidebarLink>
          <SidebarLinkWithSubMenu 
            href="/campanhas" 
            icon={<HiSpeakerphone />}
            subMenuItems={[
              { href: '/campanhas/nova', label: 'Nova Campanha', icon: <HiPlus /> },
              { href: '/campanhas/rascunhos', label: 'Rascunhos', icon: <HiPencil /> }
            ]}
          >
            Campanhas
          </SidebarLinkWithSubMenu>
          <SidebarLink href="/estatisticas" icon={<HiChartPie />}>
            Estatísticas
          </SidebarLink>
          <SidebarLink href="/relatorios" icon={<HiDocumentReport />}>
            Relatórios
          </SidebarLink>
          <SidebarLink href="/configuracoes" icon={<HiCog />}>
            Configurações
          </SidebarLink>
        </nav>
      </div>
      
      <div className="p-5 mt-auto">
        <div className="bg-blue-50 p-4 rounded-lg text-sm">
          <p className="font-medium text-blue-600 mb-1">Dica Pro</p>
          <p className="text-gray-600">
            Envie promoções em horários estratégicos para aumentar o engajamento.
          </p>
        </div>
      </div>
    </div>
  );
} 