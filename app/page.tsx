'use client';

import { useState } from 'react';

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
  const [cookie, setCookie] = useState('');
  const [membershipIds, setMembershipIds] = useState('');
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

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
      const response = await fetch('/api/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cookie,
          membershipIds: ids,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Validation failed');
      }

      const data = await response.json();
      setResults(data.results);
      setProgress({ current: data.results.length, total: ids.length });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            IEEE Membership Validator
          </h1>
          <p className="text-gray-600 mb-8">
            Bulk validate IEEE membership numbers and extract membership details
          </p>

          <div className="space-y-6">
            {/* Cookie Input */}
            <div>
              <label htmlFor="cookie" className="block text-sm font-medium text-gray-700 mb-2">
                Authentication Cookie (PA.Global_Websession)
              </label>
              <input
                type="password"
                id="cookie"
                value={cookie}
                onChange={(e) => setCookie(e.target.value)}
                placeholder="Paste your PA.Global_Websession cookie here"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="mt-2 text-sm text-gray-500">
                Get this from your browser's Developer Tools → Application → Cookies
              </p>
            </div>

            {/* Membership IDs Input */}
            <div>
              <label htmlFor="membershipIds" className="block text-sm font-medium text-gray-700 mb-2">
                Membership IDs (one per line, or comma/space separated)
              </label>
              <textarea
                id="membershipIds"
                value={membershipIds}
                onChange={(e) => setMembershipIds(e.target.value)}
                placeholder="99634594&#10;12345678&#10;98765432"
                rows={10}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
              />
              <p className="mt-2 text-sm text-gray-500">
                Enter IEEE member numbers (8-9 digits) or email addresses, one per line
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Progress */}
            {loading && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span>Processing...</span>
                  <span>
                    {progress.current} / {progress.total}
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleValidate}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Validating...' : 'Validate Memberships'}
            </button>

            {/* Results */}
            {results.length > 0 && (
              <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Results ({results.length} members)
                  </h2>
                  <button
                    onClick={handleDownload}
                    className="bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    Download CSV
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                          IEEE Number
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                          Name Initials
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                          Grade
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                          Standards
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Societies
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {results.map((result, idx) => (
                        <tr key={idx} className={result.error ? 'bg-red-50' : ''}>
                          <td className="px-4 py-3 text-sm font-mono border-r">{result.ieee_number}</td>
                          <td className="px-4 py-3 text-sm border-r">
                            {result.name_initials || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm border-r">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                result.membership_status === 'Active'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {result.membership_status || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm border-r">
                            {result.member_grade || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm border-r">
                            {result.standards_association_member || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {result.error ? (
                              <span className="text-red-600">{result.error}</span>
                            ) : (
                              <div className="max-w-xs">
                                {result.society_memberships ? (
                                  <div className="text-xs">
                                    {result.society_memberships.split(', ').map((soc, i) => (
                                      <div key={i} className="mb-1">
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
