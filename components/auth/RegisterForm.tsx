'use client';

import React, { useState, useRef } from 'react';
import { registerUser } from '@/app/actions/auth';
import { User, Phone, MapPin, Lock, FileCheck, Loader2, X } from 'lucide-react';

export default function RegisterForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setMessage({ type: 'error', text: 'File size must be under 5MB.' });
                return;
            }
            const objectUrl = URL.createObjectURL(file);
            setPreviewUrl(objectUrl);
        }
    }

    function removeFile() {
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsLoading(true);
        setMessage(null);

        const formData = new FormData(event.currentTarget);
        const result = await registerUser(formData);

        setIsLoading(false);
        if (result.error) {
            setMessage({ type: 'error', text: result.error });
        } else if (result.success) {
            setMessage({ type: 'success', text: result.message || 'Success!' });
            (event.target as HTMLFormElement).reset();
            setPreviewUrl(null);
        }
    }

    return (
        <div className="max-w-md w-full mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden transform transition-all hover:scale-[1.01]">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white">
                <h2 className="text-3xl font-bold tracking-tight">Create Account</h2>
                <p className="mt-2 text-blue-100 opacity-90">Please provide a photo of your Valid ID for verification</p>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                {message && (
                    <div className={`p-4 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-2 ${
                        message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                        {message.text}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">First Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input name="firstName" type="text" required className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Juan" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Last Name</label>
                        <input name="lastName" type="text" required className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Dela Cruz" />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Address / Purok</label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input name="address" type="text" required className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Purok 4, Brgy. Central" />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Contact Number</label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input name="contactNumber" type="tel" required className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="09123456789" />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input name="password" type="password" required className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="••••••••" />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Upload Valid ID (Image)</label>
                    
                    {!previewUrl ? (
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-slate-700 border-dashed rounded-xl hover:border-blue-400 transition-colors bg-gray-50 dark:bg-slate-800/50">
                            <div className="space-y-1 text-center">
                                <FileCheck className="mx-auto h-10 w-10 text-gray-400" />
                                <div className="flex text-sm text-gray-600 dark:text-slate-400">
                                    <label className="relative cursor-pointer bg-transparent rounded-md font-medium text-blue-600 hover:text-blue-500 transition-colors">
                                        <span>Click to upload a photo of your ID</span>
                                        <input 
                                            name="validId" 
                                            type="file" 
                                            required 
                                            accept="image/*" 
                                            className="sr-only" 
                                            onChange={handleFileChange}
                                            ref={fileInputRef}
                                        />
                                    </label>
                                </div>
                                <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                            </div>
                        </div>
                    ) : (
                        <div className="relative mt-1 rounded-xl overflow-hidden border-2 border-blue-500 shadow-lg group">
                            <img src={previewUrl} alt="ID Preview" className="w-full h-48 object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    type="button" 
                                    onClick={removeFile}
                                    className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-blue-600 text-white text-[10px] uppercase font-bold text-center py-1">
                                Selected ID Card
                            </div>
                        </div>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        'Submit Registration'
                    )}
                </button>
            </form>
        </div>
    );
}
