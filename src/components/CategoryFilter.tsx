import React from 'react';
import { Calendar, MapPin, Filter, Search } from 'lucide-react';

interface CategoryFilterProps {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  onFiltersChange?: (filters: FilterOptions) => void;
  onClearFilters?: () => void;
}

export interface FilterOptions {
  dateFrom?: string;
  dateTo?: string;
  timeFrom?: string;
  timeTo?: string;
  city?: string;
  country?: string;
  category: string;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  activeCategory,
  onCategoryChange,
  onFiltersChange,
  onClearFilters,
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);
  const [filters, setFilters] = React.useState<FilterOptions>({
    dateFrom: '',
    dateTo: '',
    timeFrom: '',
    timeTo: '',
    city: '',
    country: '',
    category: activeCategory,
  });

  // Listen for global filter clear events
  React.useEffect(() => {
    const handleFiltersClear = (event: CustomEvent) => {
      const defaultFilters = event.detail?.filters || {
        dateFrom: '',
        dateTo: '',
        timeFrom: '',
        timeTo: '',
        city: '',
        country: '',
        category: 'All',
      };
      
      // Reset local filter state
      setFilters(defaultFilters);
      setShowAdvancedFilters(false);
    };

    document.addEventListener('filters:cleared', handleFiltersClear as EventListener);
    
    return () => {
      document.removeEventListener('filters:cleared', handleFiltersClear as EventListener);
    };
  }, []);

  // Update filters when activeCategory changes from parent
  React.useEffect(() => {
    setFilters(prev => ({
      ...prev,
      category: activeCategory
    }));
  }, [activeCategory]);

  // Popular cities for quick selection
  const popularCities = [
    'Miami', 'Austin', 'Seattle', 'Denver', 'Portland', 'Nashville', 'Atlanta', 'Phoenix', 'Boston', 'Las Vegas',
    'New York', 'Los Angeles', 'San Francisco', 'Chicago', 'Houston', 'Philadelphia', 'San Antonio', 'San Diego',
    'Dallas', 'San Jose', 'Detroit', 'Jacksonville', 'Indianapolis', 'Columbus', 'Fort Worth', 'Charlotte',
    'Memphis', 'Baltimore', 'Milwaukee', 'Albuquerque', 'Tucson', 'Fresno', 'Sacramento', 'Kansas City',
    'Mesa', 'Virginia Beach', 'Atlanta', 'Colorado Springs', 'Omaha', 'Raleigh', 'Long Beach', 'Miami Beach',
    'London', 'Manchester', 'Birmingham', 'Liverpool', 'Leeds', 'Sheffield', 'Bristol', 'Glasgow', 'Edinburgh',
    'Berlin', 'Munich', 'Hamburg', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Dortmund', 'Essen',
    'Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven', 'Tilburg', 'Groningen', 'Almere',
    'Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux',
    'Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa', 'Winnipeg', 'Quebec City',
    'Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Newcastle', 'Canberra',
    'Madrid', 'Barcelona', 'Valencia', 'Seville', 'Zaragoza', 'Málaga', 'Murcia', 'Palma', 'Las Palmas',
    'Rome', 'Milan', 'Naples', 'Turin', 'Palermo', 'Genoa', 'Bologna', 'Florence', 'Bari', 'Catania',
    'São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza', 'Belo Horizonte', 'Manaus', 'Curitiba',
    'Mexico City', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana', 'León', 'Juárez', 'Zapopan',
    'Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'La Plata', 'San Miguel de Tucumán', 'Mar del Plata',
    'Stockholm', 'Gothenburg', 'Malmö', 'Uppsala', 'Västerås', 'Örebro', 'Linköping', 'Helsingborg',
    'Oslo', 'Bergen', 'Stavanger', 'Trondheim', 'Drammen', 'Fredrikstad', 'Kristiansand', 'Sandnes',
    'Copenhagen', 'Aarhus', 'Odense', 'Aalborg', 'Esbjerg', 'Randers', 'Kolding', 'Horsens',
    'Brussels', 'Antwerp', 'Ghent', 'Charleroi', 'Liège', 'Bruges', 'Namur', 'Leuven',
    'Zurich', 'Geneva', 'Basel', 'Lausanne', 'Bern', 'Winterthur', 'Lucerne', 'St. Gallen',
    'Vienna', 'Graz', 'Linz', 'Salzburg', 'Innsbruck', 'Klagenfurt', 'Villach', 'Wels',
    'Lisbon', 'Porto', 'Vila Nova de Gaia', 'Amadora', 'Braga', 'Funchal', 'Coimbra', 'Setúbal',
    'Dublin', 'Cork', 'Limerick', 'Galway', 'Waterford', 'Drogheda', 'Dundalk', 'Swords',
    'Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Tauranga', 'Napier-Hastings', 'Dunedin', 'Palmerston North',
    'Cape Town', 'Johannesburg', 'Durban', 'Pretoria', 'Port Elizabeth', 'Bloemfontein', 'East London', 'Pietermaritzburg',
    'Tokyo', 'Osaka', 'Yokohama', 'Nagoya', 'Sapporo', 'Fukuoka', 'Kobe', 'Kyoto', 'Kawasaki', 'Saitama',
    'Bangkok', 'Chiang Mai', 'Pattaya', 'Phuket', 'Hat Yai', 'Nakhon Ratchasima', 'Udon Thani', 'Khon Kaen'
  ];

  // Popular countries for quick selection
  const popularCountries = [
    'United States', 'United Kingdom', 'Germany', 'Netherlands', 'France', 'Canada', 'Australia', 
    'Spain', 'Italy', 'Brazil', 'Mexico', 'Argentina', 'Sweden', 'Norway', 'Denmark', 'Belgium', 
    'Switzerland', 'Austria', 'Portugal', 'Ireland', 'New Zealand', 'South Africa', 'Japan', 'Thailand',
    'Finland', 'Iceland', 'Luxembourg', 'Malta', 'Cyprus', 'Czech Republic', 'Poland', 'Hungary',
    'Slovenia', 'Slovakia', 'Estonia', 'Latvia', 'Lithuania', 'Croatia', 'Greece', 'Romania',
    'Bulgaria', 'Serbia', 'Montenegro', 'North Macedonia', 'Albania', 'Bosnia and Herzegovina',
    'Chile', 'Uruguay', 'Colombia', 'Peru', 'Ecuador', 'Venezuela', 'Costa Rica', 'Panama',
    'Guatemala', 'Honduras', 'El Salvador', 'Nicaragua', 'Belize', 'Jamaica', 'Trinidad and Tobago',
    'Barbados', 'Bahamas', 'Dominican Republic', 'Puerto Rico', 'Cuba', 'Haiti',
    'India', 'China', 'South Korea', 'Taiwan', 'Singapore', 'Malaysia', 'Philippines', 'Indonesia',
    'Vietnam', 'Cambodia', 'Laos', 'Myanmar', 'Bangladesh', 'Sri Lanka', 'Nepal', 'Bhutan',
    'Israel', 'Turkey', 'Lebanon', 'Jordan', 'United Arab Emirates', 'Qatar', 'Kuwait', 'Bahrain',
    'Oman', 'Saudi Arabia', 'Egypt', 'Morocco', 'Tunisia', 'Algeria', 'Libya', 'Sudan',
    'Kenya', 'Tanzania', 'Uganda', 'Rwanda', 'Ethiopia', 'Ghana', 'Nigeria', 'Senegal',
    'Ivory Coast', 'Mali', 'Burkina Faso', 'Niger', 'Chad', 'Cameroon', 'Central African Republic',
    'Democratic Republic of the Congo', 'Republic of the Congo', 'Gabon', 'Equatorial Guinea',
    'São Tomé and Príncipe', 'Angola', 'Zambia', 'Zimbabwe', 'Botswana', 'Namibia', 'Lesotho',
    'Swaziland', 'Madagascar', 'Mauritius', 'Seychelles', 'Comoros', 'Mayotte', 'Réunion'
  ];

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    if (key === 'category') {
      onCategoryChange(value);
    }
    
    if (onFiltersChange) {
      onFiltersChange(newFilters);
    }
  };

  const clearFilters = () => {
    const clearedFilters: FilterOptions = {
      dateFrom: '',
      dateTo: '',
      timeFrom: '',
      timeTo: '',
      city: '',
      country: '',
      category: 'All',
    };
    setFilters(clearedFilters);
    setShowAdvancedFilters(false);
    onCategoryChange('All');
    if (onFiltersChange) {
      onFiltersChange(clearedFilters);
    }
    
    // Broadcast filter clear event
    const filterClearEvent = new CustomEvent('filters:cleared', {
      detail: { filters: clearedFilters }
    });
    document.dispatchEvent(filterClearEvent);
  };

  const hasActiveFilters = filters.dateFrom || filters.dateTo || filters.timeFrom || 
                          filters.timeTo || filters.city || filters.country || 
                          activeCategory !== 'All';

  return (
    <div className="mb-8 space-y-6">
      {/* Category Pills */}
      <div className="flex flex-wrap justify-center gap-3">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => handleFilterChange('category', category)}
            className={`
              px-6 py-3 rounded-full font-medium text-sm transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black
              ${
                activeCategory === category
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25 border border-purple-500/50'
                  : 'bg-gray-900/50 text-gray-300 border border-gray-700 hover:bg-gray-800/70 hover:text-white hover:border-purple-500/30'
              }
            `}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Advanced Filters Toggle */}
      <div className="text-center">
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-white rounded-lg border border-gray-700 hover:border-purple-500/30 transition-all duration-200"
        >
          <Filter size={16} />
          <span>{showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
          )}
        </button>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Date Range */}
            <div className="space-y-3">
              <label className="flex items-center text-sm font-medium text-gray-300 mb-2">
                <Calendar size={16} className="mr-2 text-purple-500" />
                Date Range
              </label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="From date"
                />
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="To date"
                />
              </div>
            </div>

            {/* Time Range */}
            <div className="space-y-3">
              <label className="flex items-center text-sm font-medium text-gray-300 mb-2">
                <MapPin size={16} className="mr-2 text-purple-500" />
                Location
              </label>
              <div className="space-y-2">
                <div className="relative">
                  <select
                    value={filters.city}
                    onChange={(e) => handleFilterChange('city', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select city...</option>
                    {popularCities.map((city) => (
                      <option key={city} value={city} className="bg-gray-800">
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <select
                    value={filters.country}
                    onChange={(e) => handleFilterChange('country', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select country...</option>
                    {popularCountries.map((country) => (
                      <option key={country} value={country} className="bg-gray-800">
                        {country}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Location Buttons */}

          {/* Filter Action Buttons */}
          <div className="mt-6 pt-6 border-t border-gray-800 flex justify-center space-x-4">
            <button
              onClick={clearFilters}
              className="px-6 py-2 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white border border-gray-600 hover:border-gray-500 rounded-lg transition-all duration-200 text-sm"
            >
              Clear All Filters
            </button>
            <button
              onClick={() => {
                if (onFiltersChange) {
                  onFiltersChange(filters);
                }
              }}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 text-sm"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryFilter;