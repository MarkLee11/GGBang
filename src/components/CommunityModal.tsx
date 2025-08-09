import React, { useState, useEffect } from 'react';
import { X, Users, MessageCircle, Calendar, MapPin, User, Plus, Search, TrendingUp, Clock, MessageSquare, Heart, Share2, Hash, Pin, Eye, ThumbsUp, Filter } from 'lucide-react';

interface CommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any;
  onJoinClick?: () => void;
}

// Mock data for community features
const mockGroups = [
  {
    id: 1,
    name: 'Pride Events NYC',
    description: 'Organizing and attending Pride events in New York City',
    members: 1247,
    category: 'Events',
    image: 'https://images.pexels.com/photos/3692748/pexels-photo-3692748.jpeg?auto=compress&cs=tinysrgb&w=400',
    isJoined: false,
    recentActivity: '2 hours ago',
    posts: 156,
    online: 23
  },
  {
    id: 2,
    name: 'Gay Professionals Network',
    description: 'Networking and career development for LGBTQ+ professionals',
    members: 892,
    category: 'Professional',
    image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400',
    isJoined: true,
    recentActivity: '1 day ago',
    posts: 89,
    online: 12
  },
  {
    id: 3,
    name: 'Rainbow Book Club',
    description: 'Monthly book discussions featuring LGBTQ+ authors and themes',
    members: 456,
    category: 'Culture',
    image: 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=400',
    isJoined: false,
    recentActivity: '3 days ago',
    posts: 67,
    online: 8
  },
  {
    id: 4,
    name: 'Fitness & Wellness',
    description: 'Health, fitness, and wellness support for the LGBTQ+ community',
    members: 634,
    category: 'Health',
    image: 'https://images.pexels.com/photos/416778/pexels-photo-416778.jpeg?auto=compress&cs=tinysrgb&w=400',
    isJoined: true,
    recentActivity: '5 hours ago',
    posts: 234,
    online: 18
  },
  {
    id: 5,
    name: 'Travel Together',
    description: 'LGBTQ+ friendly travel destinations and group trips',
    members: 789,
    category: 'Travel',
    image: 'https://images.pexels.com/photos/1008155/pexels-photo-1008155.jpeg?auto=compress&cs=tinysrgb&w=400',
    isJoined: false,
    recentActivity: '1 hour ago',
    posts: 145,
    online: 15
  }
];

const mockDiscussions = [
  {
    id: 1,
    title: 'Best Pride events this summer?',
    author: 'Alex Rainbow',
    authorAvatar: 'AR',
    group: 'Pride Events NYC',
    replies: 23,
    likes: 45,
    views: 234,
    timeAgo: '2 hours ago',
    isPinned: true,
    tags: ['pride', 'summer', 'nyc']
  },
  {
    id: 2,
    title: 'Career advice for coming out at work',
    author: 'Jordan Smith',
    authorAvatar: 'JS',
    group: 'Gay Professionals Network',
    replies: 18,
    likes: 67,
    views: 189,
    timeAgo: '4 hours ago',
    isPinned: false,
    tags: ['career', 'workplace', 'advice']
  },
  {
    id: 3,
    title: 'Book recommendation: "Red: A Crayon\'s Story"',
    author: 'Sam Reader',
    authorAvatar: 'SR',
    group: 'Rainbow Book Club',
    replies: 12,
    likes: 28,
    views: 156,
    timeAgo: '1 day ago',
    isPinned: false,
    tags: ['books', 'recommendation', 'lgbtq']
  },
  {
    id: 4,
    title: 'HIIT workout routine that actually works!',
    author: 'Casey Fit',
    authorAvatar: 'CF',
    group: 'Fitness & Wellness',
    replies: 31,
    likes: 89,
    views: 345,
    timeAgo: '6 hours ago',
    isPinned: false,
    tags: ['fitness', 'workout', 'hiit']
  },
  {
    id: 5,
    title: 'Gay-friendly destinations in Europe',
    author: 'Riley Explorer',
    authorAvatar: 'RE',
    group: 'Travel Together',
    replies: 42,
    likes: 156,
    views: 567,
    timeAgo: '3 hours ago',
    isPinned: true,
    tags: ['travel', 'europe', 'gay-friendly']
  }
];

const CommunityModal: React.FC<CommunityModalProps> = ({ isOpen, onClose, user, onJoinClick }) => {
  const [activeTab, setActiveTab] = useState<'groups' | 'discussions' | 'trending'>('groups');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [groups, setGroups] = useState(mockGroups);

  const categories = ['All', 'Events', 'Professional', 'Culture', 'Health', 'Travel'];

  // Handle escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Filter groups based on search and category
  const filteredGroups = groups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         group.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || group.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Filter discussions based on search
  const filteredDiscussions = mockDiscussions.filter(discussion =>
    discussion.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    discussion.group.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle join/leave group
  const handleGroupAction = (groupId: number) => {
    if (!user) {
      onJoinClick?.();
      return;
    }

    setGroups(prevGroups =>
      prevGroups.map(group =>
        group.id === groupId
          ? {
              ...group,
              isJoined: !group.isJoined,
              members: group.isJoined ? group.members - 1 : group.members + 1
            }
          : group
      )
    );
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="community-title"
    >
      <div className="relative w-full max-w-6xl max-h-[90vh] bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden animate-modal-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Users size={20} className="text-white" />
            </div>
            <div>
              <h2 id="community-title" className="text-2xl font-bold text-white">
                Community
              </h2>
              <p className="text-gray-400 text-sm">Connect, share, and grow together</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-800/50">
          <div className="flex space-x-1 bg-gray-800/50 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('groups')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                activeTab === 'groups'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <Users size={16} />
              <span>Groups</span>
            </button>
            <button
              onClick={() => setActiveTab('discussions')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                activeTab === 'discussions'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <MessageCircle size={16} />
              <span>Discussions</span>
            </button>
            <button
              onClick={() => setActiveTab('trending')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                activeTab === 'trending'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <TrendingUp size={16} />
              <span>Trending</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search community..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 w-64"
            />
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'groups' && (
            <div className="p-6">
              {/* Category Filter */}
              <div className="flex flex-wrap gap-2 mb-6">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      selectedCategory === category
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {/* Groups Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGroups.map((group) => (
                  <div
                    key={group.id}
                    className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:bg-gray-800/70 hover:border-purple-500/50 transition-all duration-300 group"
                  >
                    {/* Group Image */}
                    <div className="w-full h-32 rounded-lg overflow-hidden mb-4 bg-gradient-to-br from-purple-600 to-pink-600">
                      <img 
                        src={group.image} 
                        alt={group.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    {/* Group Info */}
                    <div className="mb-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold text-white group-hover:text-purple-400 transition-colors">
                          {group.name}
                        </h3>
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full border border-purple-500/30">
                          {group.category}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                        {group.description}
                      </p>
                    </div>

                    {/* Group Stats */}
                    <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <Users size={14} />
                          <span>{group.members.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageSquare size={14} />
                          <span>{group.posts}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>{group.online}</span>
                        </div>
                      </div>
                      <span className="text-xs">{group.recentActivity}</span>
                    </div>

                    {/* Join Button */}
                    <button
                      onClick={() => handleGroupAction(group.id)}
                      className={`w-full py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                        group.isJoined
                          ? 'bg-gray-700 hover:bg-red-600/20 text-gray-300 hover:text-red-400 border border-gray-600 hover:border-red-500/50'
                          : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white transform hover:scale-105'
                      }`}
                    >
                      {group.isJoined ? 'Leave Group' : 'Join Group'}
                    </button>
                  </div>
                ))}
              </div>

              {filteredGroups.length === 0 && (
                <div className="text-center py-16">
                  <Users size={48} className="text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No groups found</h3>
                  <p className="text-gray-400">Try adjusting your search or category filter</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'discussions' && (
            <div className="p-6">
              {/* Discussions List */}
              <div className="space-y-4">
                {filteredDiscussions.map((discussion) => (
                  <div
                    key={discussion.id}
                    className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:bg-gray-800/70 hover:border-purple-500/50 transition-all duration-300 cursor-pointer group"
                  >
                    <div className="flex items-start space-x-4">
                      {/* Author Avatar */}
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                        {discussion.authorAvatar}
                      </div>

                      {/* Discussion Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {discussion.isPinned && (
                              <Pin size={16} className="text-purple-400" />
                            )}
                            <h3 className="text-lg font-semibold text-white group-hover:text-purple-400 transition-colors">
                              {discussion.title}
                            </h3>
                          </div>
                          <span className="text-xs text-gray-500 flex-shrink-0">{discussion.timeAgo}</span>
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-gray-400 mb-3">
                          <span className="font-medium text-gray-300">{discussion.author}</span>
                          <span>in</span>
                          <span className="text-purple-400">{discussion.group}</span>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {discussion.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2 py-1 bg-gray-700/50 text-gray-300 text-xs rounded-full"
                            >
                              <Hash size={10} className="mr-1" />
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* Discussion Stats */}
                        <div className="flex items-center space-x-6 text-sm text-gray-400">
                          <div className="flex items-center space-x-1">
                            <MessageSquare size={14} />
                            <span>{discussion.replies} replies</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Heart size={14} />
                            <span>{discussion.likes} likes</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Eye size={14} />
                            <span>{discussion.views} views</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredDiscussions.length === 0 && (
                <div className="text-center py-16">
                  <MessageCircle size={48} className="text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No discussions found</h3>
                  <p className="text-gray-400">Try adjusting your search terms</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'trending' && (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Trending Topics */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <TrendingUp size={20} className="mr-2 text-purple-500" />
                    Trending Topics
                  </h3>
                  <div className="space-y-3">
                    {['#Pride2024', '#CareerAdvice', '#BookClub', '#FitnessGoals', '#TravelTips'].map((topic, index) => (
                      <div key={topic} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <span className="text-purple-400 font-semibold">#{index + 1}</span>
                          <span className="text-white font-medium">{topic}</span>
                        </div>
                        <span className="text-gray-400 text-sm">{Math.floor(Math.random() * 500) + 100} posts</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active Members */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Users size={20} className="mr-2 text-purple-500" />
                    Most Active Members
                  </h3>
                  <div className="space-y-3">
                    {[
                      { name: 'Alex Rainbow', posts: 156, avatar: 'AR' },
                      { name: 'Jordan Smith', posts: 134, avatar: 'JS' },
                      { name: 'Casey Fit', posts: 128, avatar: 'CF' },
                      { name: 'Riley Explorer', posts: 112, avatar: 'RE' },
                      { name: 'Sam Reader', posts: 98, avatar: 'SR' }
                    ].map((member, index) => (
                      <div key={member.name} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <span className="text-purple-400 font-semibold">#{index + 1}</span>
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                            {member.avatar}
                          </div>
                          <span className="text-white font-medium">{member.name}</span>
                        </div>
                        <span className="text-gray-400 text-sm">{member.posts} posts</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Community Stats */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-purple-400 mb-1">5.2k</div>
                  <div className="text-gray-400 text-sm">Total Members</div>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-pink-400 mb-1">1.8k</div>
                  <div className="text-gray-400 text-sm">Active Today</div>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-blue-400 mb-1">12.4k</div>
                  <div className="text-gray-400 text-sm">Total Posts</div>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-green-400 mb-1">89</div>
                  <div className="text-gray-400 text-sm">Groups</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!user && (
          <div className="border-t border-gray-800 p-6 bg-gray-900/95">
            <div className="text-center">
              <p className="text-gray-400 mb-4">Join our community to participate in discussions and connect with others!</p>
              <button
                onClick={onJoinClick}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25"
              >
                Join Community
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityModal;