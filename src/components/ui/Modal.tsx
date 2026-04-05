'use client';

import { Fragment, type ReactNode } from 'react';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
} as const;

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: keyof typeof sizeClasses;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  size = 'md',
  children,
  footer,
}: ModalProps) {
  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" />
        </TransitionChild>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <DialogPanel
              className={cn(
                'w-full rounded-xl bg-white shadow-xl',
                sizeClasses[size]
              )}
            >
              {title && (
                <div className="flex items-center justify-between px-6 py-4 border-b border-redin-earth-100">
                  <DialogTitle className="text-lg font-semibold text-redin-earth-900">
                    {title}
                  </DialogTitle>
                  <button
                    onClick={onClose}
                    className="p-1 rounded-lg hover:bg-redin-earth-100 transition-colors"
                    aria-label="Cerrar"
                  >
                    <X className="h-5 w-5 text-redin-earth-400" />
                  </button>
                </div>
              )}
              <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
                {children}
              </div>
              {footer && (
                <div className="px-6 py-4 border-t border-redin-earth-100 flex justify-end gap-3">
                  {footer}
                </div>
              )}
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
