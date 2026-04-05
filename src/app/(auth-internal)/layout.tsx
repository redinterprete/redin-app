import type { ReactNode } from 'react';
import { Shield } from 'lucide-react';

export default function AuthInternalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-redin-forest-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="h-6 w-6 text-redin-forest-300" />
            <span className="text-xl font-semibold text-white">Portal Interno</span>
          </div>
          <p className="text-sm text-redin-forest-400">
            REDIN — Red de Interpretes y Promotores Interculturales
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl border border-redin-forest-200 shadow-sm p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
