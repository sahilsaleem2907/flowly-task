import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../components/ui/local/Button';
import { USER_ONE, USER_TWO } from '../types/User';
import type { User } from '../types/User';

interface AuthPageProps {
    onNavigateToDocument: (user: User) => void;
    onNavigateToFractional?: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onNavigateToDocument }) => {
    const [email, setEmail] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [showVerification, setShowVerification] = useState(false);

    const [emailError, setEmailError] = useState('');
    const [verificationError, setVerificationError] = useState('');

    // Email validation regex
    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // Verification code validation regex (6 digits, alphanumeric)
    const validateVerificationCode = (code: string) => {
        const codeRegex = /^[A-Za-z0-9]{6}$/;
        return codeRegex.test(code);
    };

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setEmail(value);

        if (value && !validateEmail(value)) {
            setEmailError('Please enter a valid email address');
        } else {
            setEmailError('');
        }
    };

    const handleVerificationCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.toUpperCase(); // Convert to uppercase
        setVerificationCode(value);

        if (value && !validateVerificationCode(value)) {
            setVerificationError('Please enter a 6-character alphanumeric code');
        } else {
            setVerificationError('');
        }
    };

    const handleContinueWithEmail = () => {
        if (email.trim() && validateEmail(email)) {
            // Check if email is one of the allowed demo emails
            if (email !== USER_ONE.email && email !== USER_TWO.email) {
                setEmailError('This email is not registered for the demo. Use one of the provided demo emails.');
                return;
            }

            setShowVerification(true);
        }
    };

    const handleContinueWithVerification = () => {
        if (verificationCode.trim() && validateVerificationCode(verificationCode)) {
            // Check which user is logging in based on email
            let user: User | null = null;

            if (email === USER_ONE.email && verificationCode === 'ALICE1') {
                user = USER_ONE;
            } else if (email === USER_TWO.email && verificationCode === 'BOB123') {
                user = USER_TWO;
            } else {
                setVerificationError('Invalid verification code for this email');
                return;
            }

            // Navigate to DocumentPage with authenticated user
            onNavigateToDocument(user);
        }
    };

    const handleChangeEmail = () => {
        setShowVerification(false);
        setEmail('');
        setVerificationCode('');
        setEmailError('');
        setVerificationError('');
    };

    const purpleColor = 'rgba(139, 92, 246, 1)';
    const purpleFillColor = 'rgba(139, 92, 246, 0.2)';

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--off-white)' }}>
            {/* Header */}
            <div className="p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <div className="w-6 h-6 bg-purple-700 rounded flex items-center justify-center mr-2">
                            <span className="text-white text-sm font-bold">Fl</span>
                        </div>
                        <span className="text-gray-700 font-medium">Flowly</span>
                    </div>


                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center px-4">
                <div className="w-full max-w-sm">
                    <h1 className="text-2xl font-semibold text-center mb-4 text-gray-900">
                        Log in
                    </h1>



                    <div className="space-y-3">
                        {/* Google Login Button */}
                        <button className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50 bg-white transition-colors">
                            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                                <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                />
                                <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                            <span className="text-gray-700 font-medium">Continue with Google</span>
                        </button>

                        {/* Apple Login Button */}
                        <button className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50 bg-white transition-colors">
                            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                            </svg>
                            <span className="text-gray-700 font-medium">Continue with Apple</span>
                        </button>
                    </div>

                    {/* Email/Verification Form - Fixed Height Container */}
                    <div className="mt-6" style={{ height: '200px' }}>
                        <div className="relative h-full">
                            {/* Email Form */}
                            <AnimatePresence>
                                {!showVerification && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ duration: 0.25 }}
                                        className="absolute inset-0"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <label htmlFor="email" className="block text-sm text-gray-600">
                                                Email
                                            </label>
                                        </div>
                                        <input
                                            type="email"
                                            id="email"
                                            value={email}
                                            onChange={handleEmailChange}
                                            placeholder="Enter your email address..."
                                            className={`w-full px-3 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${emailError ? 'border-red-500' : 'border-gray-300'
                                                }`}
                                        />
                                        {emailError && (
                                            <p className="text-red-500 text-xs mt-1">{emailError}</p>
                                        )}

                                        <Button
                                            text="Continue with email"
                                            borderColor={purpleColor}
                                            fillColor={purpleFillColor}
                                            onClick={handleContinueWithEmail}
                                            disabled={!email.trim() || !validateEmail(email)}
                                            className="mt-3"
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Verification Code Form */}
                            <AnimatePresence>
                                {showVerification && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ duration: 0.25 }}
                                        className="absolute inset-0"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <label htmlFor="verification" className="block text-sm text-gray-600">
                                                Verification Code
                                            </label>
                                            <button
                                                onClick={handleChangeEmail}
                                                className="text-sm text-purple-600 hover:text-purple-700 transition-colors"
                                                style={{ color: purpleColor }}
                                            >
                                                Change email
                                            </button>
                                        </div>

                                        <input
                                            type="text"
                                            id="verification"
                                            value={verificationCode}
                                            onChange={handleVerificationCodeChange}
                                            placeholder="Enter 6-character code..."
                                            maxLength={6}
                                            className={`w-full px-3 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${verificationError ? 'border-red-500' : 'border-gray-300'}`}
                                        />
                                        {verificationError && (
                                            <p className="text-red-500 text-xs mt-1">{verificationError}</p>
                                        )}

                                        <Button
                                            text="Continue with verification"
                                            borderColor={purpleColor}
                                            fillColor={purpleFillColor}
                                            onClick={handleContinueWithVerification}
                                            disabled={!verificationCode.trim() || !validateVerificationCode(verificationCode)}
                                            className="mt-3"
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Demo Credentials Notice */}
                    <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <h3 className="text-sm font-medium text-blue-800 mb-2">Demo Credentials</h3>
                        <div className="text-xs text-blue-700 space-y-1">
                            <div><strong>User 1:</strong> {USER_ONE.email} → Code: <code className="bg-blue-100 px-1 rounded">ALICE1</code></div>
                            <div><strong>User 2:</strong> {USER_TWO.email} → Code: <code className="bg-blue-100 px-1 rounded">BOB123</code></div>
                        </div>
                        <p className="text-xs text-blue-600 mt-2">Use these credentials to test the application from different devices.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;