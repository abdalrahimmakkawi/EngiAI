import React from 'react';
import { Plus, Trash2, LogOut, X } from 'lucide-react';

interface Session {
  id: string;
  topic: string;
  last_active: string;
  message_count: number;
  created_at: string;
}

interface SidebarProps {
  sessions: Session[];
  currentSessionId: string;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  user: {
    id: string;
    email?: string;
    full_name?: string;
  };
  onSignOut: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  isOpen,
  onToggle,
  user,
  onSignOut,
}) => {
  const handleDeleteClick = (sessionId: string) => {
    if (window.confirm('Are you sure you want to delete this chat?')) {
      onDeleteSession(sessionId);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays === 0) {
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return diffMins <= 1 ? 'just now' : `${diffMins}m ago`;
      }
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const groupSessionsByDate = (sessions: Session[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups: { [key: string]: Session[] } = {
      Today: [],
      Yesterday: [],
      Earlier: [],
    };

    sessions.forEach(session => {
      const sessionDate = new Date(session.last_active);
      if (sessionDate >= today) {
        groups.Today.push(session);
      } else if (sessionDate >= yesterday && sessionDate < today) {
        groups.Yesterday.push(session);
      } else {
        groups.Earlier.push(session);
      }
    });

    return groups;
  };

  const sessionGroups = groupSessionsByDate(sessions);

  return (
    <div
      className={`fixed left-0 top-0 h-full bg-[#0d0d14] border-r border-[#1e1e2e] transition-all duration-300 z-30 ${
        isOpen ? 'w-64' : 'w-0'
      } overflow-hidden`}
    >
      <div className="flex flex-col h-full">
        {/* Header with toggle */}
        <div className="flex items-center justify-between p-4 border-b border-[#1e1e2e]">
          <h2 className="text-white font-semibold">EngiAI</h2>
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-2 px-4 py-3 bg-transparent border border-cyan-500 text-cyan-500 rounded-lg hover:bg-cyan-500 hover:text-[#0d0d14] transition-all"
          >
            <Plus size={16} />
            <span className="font-medium">New Chat</span>
          </button>
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {Object.entries(sessionGroups).map(([groupName, groupSessions]) => (
            groupSessions.length > 0 && (
              <div key={groupName} className="mb-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {groupName}
                </h3>
                <div className="space-y-1">
                  {groupSessions.map((session) => (
                    <div
                      key={session.id}
                      className={`group relative flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all ${
                        currentSessionId === session.id
                          ? 'bg-[#1e1e2e] border-l-2 border-cyan-500'
                          : 'hover:bg-[#1a1a2e]'
                      }`}
                      onClick={() => onSelectSession(session.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-200 truncate">
                          {session.topic}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatTimeAgo(session.last_active)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(session.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-500 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>

        {/* User Section */}
        <div className="border-t border-[#1e1e2e] p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-sm font-semibold">
              {user.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-200 truncate">
                {user.email}
              </p>
            </div>
          </div>
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
