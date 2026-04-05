import type { ReactNode } from 'react';
import { Building2 } from 'lucide-react';

export default function AuthInstitutionLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-redin-earth-50 to-redin-gold-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Building2 className="h-6 w-6 text-redin-gold-400" />
            <span className="text-xl font-semibold text-redin-earth-800">Portal Institucional</span>
          </div>
          <p className="text-sm text-redin-earth-500">
            REDIN — Red de Interpretes y Promotores Interculturales
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl border border-redin-gold-200 shadow-sm p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
