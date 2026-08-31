import { Ticket, ClipboardList, Calendar, Settings } from 'lucide-react';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const navItems = [
  { id: 'grid', icon: Ticket, label: 'Tickets' },
  { id: 'mytickets', icon: ClipboardList, label: 'My Tickets' },
  { id: 'draws', icon: Calendar, label: 'Draws' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

export function Navbar({ currentPage, onNavigate }: NavbarProps) {
  return (
    <nav className="navbar">
      {navItems.map((item) => {
        const IconComponent = item.icon;
        const isActive = currentPage === item.id;
        return (
          <button
            key={item.id}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <IconComponent size={20} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
