'use client';

import { useState } from 'react';
import packageJson from '../package.json';

interface ValidationResult {
  ieee_number: string;
  name_initials: string | null;
  membership_status: string | null;
  member_grade: string | null;
  standards_association_member: string | null;
  society_memberships: string | null;
  error: string | null;
}

export default function Home() {
  const defaultCookie = 'eyJ6aXAiOiJERUYiLCJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2Iiwia2lkIjoiQk9Gbm5FbXdsUVUwVi1sRjRXcU1uWUxBZV8wIiwicGkuc3JpIjoiUXdMTU9qWlc3VXFoYlBJUmktSEZGOUJMM2pnLlRrbyJ9..B4n6yKZ8YivJBZYnDzirPA.Q6SGYZVXhx_5Csh1FhtcZQaMMKWkrsenoXgNbfjOnSr8QyPi8k5pvzAesVQkTIyRYR-790GpRz4D9SCSRH1U5DaxiQo-vA6ICPeOYEH_ozDzHVqCVJqcIiShAfM0F8eLin27G_07ohaZFOvaB5JDmzIrzD9lGIuuoGfGWWatQoDONiLfy5n6tZhTbyw2XuyOwahpvZ30ipU93dmWbiDxhowuxf3T02eYe39Yv3Skunv7I1q3qGm6h9zS4HMnLBWKzRLtr0VzNP3QURCdFn8kC32w8x-9SGzLrqrrCPo-ndLm7JCuOBZ3-VlGmgGhsnYuogmLKrcOFvMzzuMVEmbvtLPmNsVeLohbyJOs-DykMWL91iA6FSRrOGh1OQHWpOxXFMC5Eny8wJ-JLhyXimR1V3kox2vGi-kue5yxGkR4RlS_JurNsxr5LCrzsLX3ovs7oLgyhG2u5yMmQOfgw2O7a1BwAB8lEpzogmQL2lz_qLg6InohDdedGI8YY3mpbzSWGKCxI49gWo2rfxLSevZsKI6b32mxxeji2JTmD3ORusAEft8aTEBu_jgJtKzzjtIZFKeCvpZzRsTql6Yr_Fkogj2X1DHkazybWOAI5_lQGtXEUmcpUGBzSW0HRCiwchmnIOp3vak_SYK2jZg9f8Ebig.ltjs-MwGEceAg9rF1LJbKA';
  // Version automatically read from package.json
  const APP_VERSION = `v${packageJson.version}`;
  
  const [cookie, setCookie] = useState(defaultCookie);
  const [membershipIds, setMembershipIds] = useState('');
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [cookieLocked, setCookieLocked] = useState(true);

  const handleValidate = async () => {
    if (!cookie.trim()) {
      setError('Please enter your authentication cookie');
      return;
    }

    if (!membershipIds.trim()) {
      setError('Please enter at least one membership ID');
      return;
    }

    // Parse membership IDs (split by newline, comma, or space)
    const ids = membershipIds
      .split(/[\n,\s]+/)
      .map(id => id.trim())
      .filter(id => id.length > 0);

    if (ids.length === 0) {
      setError('Please enter at least one valid membership ID');
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);
    setProgress({ current: 0, total: ids.length });

    try {
      const allResults: ValidationResult[] = [];
      const batchSize = 10; // Process 10 at a time to avoid timeout
      let batchStart = 0;

      while (batchStart < ids.length) {
        const response = await fetch('/api/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cookie,
            membershipIds: ids,
            batchStart,
            batchSize,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Validation failed');
        }

      const data = await response.json();
      
      // Check if any result has a session expired or 401 error
      const hasSessionError = data.results.some((r: ValidationResult) => 
        r.error && (r.error.includes('Session expired') || r.error.includes('401') || r.error.includes('403'))
      );
      
      if (hasSessionError) {
        setCookieLocked(false); // Unlock cookie input on session error
        let errorMsg = 'Session expired or cookie invalid (401/403). ';
        if (data.refreshTriggered) {
          errorMsg += 'Cookie refresh workflow has been automatically triggered. The cookie will be updated shortly.';
        } else {
          errorMsg += 'Please update your cookie and try again.';
        }
        setError(errorMsg);
        break;
      }
      
      allResults.push(...data.results);
      setResults([...allResults]);
      setProgress({ current: allResults.length, total: ids.length });

      if (!data.hasMore) {
        break;
      }

        batchStart = data.batchEnd;
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
    }

      setProgress({ current: allResults.length, total: ids.length });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      // Unlock cookie input on any error
      if (errorMessage.includes('Session') || errorMessage.includes('Cookie') || errorMessage.includes('401') || errorMessage.includes('403')) {
        setCookieLocked(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (results.length === 0) return;

    // Convert results to CSV
    const headers = [
      'ieee_number',
      'name_initials',
      'membership_status',
      'member_grade',
      'standards_association_member',
      'society_memberships',
      'error',
    ];

    const csvRows = [
      headers.join(','),
      ...results.map(result =>
        headers.map(header => {
          const value = result[header as keyof ValidationResult];
          // Escape commas and quotes in CSV
          if (value === null || value === undefined) return '';
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      ),
    ];

    const csv = csvRows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ieee_validation_results.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="w-full border-b-2 border-white bg-black py-3 px-3 sm:py-4 sm:px-6 lg:px-8">
        <div className="w-full flex items-center justify-between">
          <div className="text-white opacity-70 text-xs sm:text-sm font-mono">
            {APP_VERSION}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <p className="text-white opacity-70 text-[10px] sm:text-xs md:text-sm font-bold whitespace-nowrap">
              Crafted by Stark (Harsh)
            </p>
            <a
              href="https://github.com/StarkAg"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-70 hover:opacity-100 transition-opacity text-white flex-shrink-0"
              aria-label="GitHub"
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
            </a>
          </div>
        </div>
      </header>
      
      <div className="py-6 sm:py-12 px-3 sm:px-4 lg:px-8">
        <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-2xl p-4 sm:p-6 lg:p-8 border border-gray-200">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-black mb-2">
            IEEE Membership Validator
          </h1>
          <p className="text-sm sm:text-base text-black mb-6 sm:mb-8 opacity-70">
            Bulk validate IEEE membership numbers and extract membership details
          </p>

          <div className="space-y-6">
            {/* Cookie Input */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-1 sm:gap-0">
                <label htmlFor="cookie" className="block text-xs sm:text-sm font-medium text-black">
                  Authentication Cookie (PA.Global_Websession)
                </label>
                {cookieLocked && (
                  <button
                    type="button"
                    onClick={() => setCookieLocked(false)}
                    className="text-xs text-black opacity-60 hover:opacity-100 underline self-start sm:self-auto"
                  >
                    Unlock to edit
                  </button>
                )}
              </div>
              <input
                type="password"
                id="cookie"
                value={cookie}
                onChange={(e) => setCookie(e.target.value)}
                disabled={cookieLocked}
                placeholder="Paste your PA.Global_Websession cookie here"
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-black rounded-lg focus:ring-2 focus:ring-black focus:outline-none bg-white text-black placeholder-gray-400 ${
                  cookieLocked ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              />
              <p className="mt-2 text-xs sm:text-sm text-black opacity-60">
                {cookieLocked 
                  ? 'Using default cookie. Click "Unlock to edit" if validation fails.'
                  : 'Get this from your browser\'s Developer Tools → Application → Cookies'
                }
              </p>
            </div>

            {/* Membership IDs Input */}
            <div>
              <label htmlFor="membershipIds" className="block text-xs sm:text-sm font-medium text-black mb-2">
                Membership IDs (one per line, or comma/space separated)
              </label>
              <textarea
                id="membershipIds"
                value={membershipIds}
                onChange={(e) => setMembershipIds(e.target.value)}
                placeholder="99634594&#10;12345678&#10;98765432"
                rows={8}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-black rounded-lg focus:ring-2 focus:ring-black focus:outline-none font-mono text-xs sm:text-sm bg-white text-black placeholder-gray-400"
              />
              <p className="mt-2 text-xs sm:text-sm text-black opacity-60">
                Enter IEEE member numbers (8-9 digits) or email addresses, one per line
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-black border-2 border-black text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm">
                {error}
              </div>
            )}

            {/* Progress */}
            {loading && (
              <div className="bg-black border-2 border-black text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg">
                <div className="flex items-center justify-between mb-2 text-xs sm:text-sm">
                  <span>Processing...</span>
                  <span>
                    {progress.current} / {progress.total}
                  </span>
                </div>
                <div className="w-full bg-white rounded-full h-2">
                  <div
                    className="bg-white h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleValidate}
              disabled={loading}
              className="w-full bg-black text-white py-3 sm:py-3.5 px-6 rounded-lg text-sm sm:text-base font-semibold hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 border-2 border-black touch-manipulation"
            >
              {loading ? 'Validating...' : 'Validate Memberships'}
            </button>

            {/* Results */}
            {results.length > 0 && (
              <div className="mt-6 sm:mt-8">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3 sm:gap-0">
                  <h2 className="text-xl sm:text-2xl font-bold text-black">
                    Results ({results.length} members)
                  </h2>
                  <button
                    onClick={handleDownload}
                    className="bg-black text-white py-2.5 sm:py-2 px-4 rounded-lg text-sm sm:text-base font-semibold hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 transition-all duration-200 border-2 border-black touch-manipulation w-full sm:w-auto"
                  >
                    Download CSV
                  </button>
                </div>

                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <div className="overflow-hidden border-2 border-black">
                      <table className="min-w-full divide-y divide-black">
                        <thead className="bg-black text-white">
                          <tr>
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium uppercase tracking-wider border-r border-white">
                              IEEE #
                            </th>
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium uppercase tracking-wider border-r border-white">
                              Name
                            </th>
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium uppercase tracking-wider border-r border-white">
                              Status
                            </th>
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium uppercase tracking-wider border-r border-white hidden sm:table-cell">
                              Grade
                            </th>
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium uppercase tracking-wider border-r border-white hidden md:table-cell">
                              Standards
                            </th>
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium uppercase tracking-wider">
                              Societies
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-black">
                          {results.map((result, idx) => (
                            <tr key={idx} className={result.error ? 'bg-black text-white' : ''}>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-mono border-r border-black whitespace-nowrap">{result.ieee_number}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm border-r border-black">
                                {result.name_initials || '-'}
                              </td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm border-r border-black">
                                {result.membership_status ? (
                                  <span
                                    className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold whitespace-nowrap ${
                                      result.membership_status === 'Active'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-red-600 text-white'
                                    }`}
                                  >
                                    {result.membership_status === 'Active' ? 'Active' : 'Not Active'}
                                  </span>
                                ) : (
                                  <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-red-600 text-white whitespace-nowrap">
                                    Not Active
                                  </span>
                                )}
                              </td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm border-r border-black hidden sm:table-cell">
                                {result.member_grade || '-'}
                              </td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm border-r border-black hidden md:table-cell">
                                {result.standards_association_member || '-'}
                              </td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                                {result.error ? (
                                  <span className="text-white text-[10px] sm:text-xs">{result.error}</span>
                                ) : (
                                  <div className="max-w-xs">
                                    {result.society_memberships ? (
                                      <div className="text-[10px] sm:text-xs">
                                        {result.society_memberships.split(', ').map((soc, i) => (
                                          <div key={i} className="mb-0.5 sm:mb-1">
                                            • {soc}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      '-'
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
