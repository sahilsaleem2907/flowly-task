import React from 'react';
import { motion } from 'framer-motion';

interface ButtonProps {
    text: string;
    borderColor: string;
    fillColor: string;
    onClick?: () => void;
    type?: 'button' | 'submit';
    disabled?: boolean;
    className?: string;
}

const Button: React.FC<ButtonProps> = ({
    text,
    borderColor,
    fillColor,
    onClick,
    type = 'button',
    disabled = false,
    className = ''
}) => {
    return (
        <motion.button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`w-full px-4 py-3 rounded-md transition-colors font-medium ${className}`}
            style={{
                backgroundColor: fillColor,
                color: disabled ? '#9ca3af' : borderColor,
                boxShadow: `0 0 4px ${borderColor}`
            }}
            whileTap={{
                scale: disabled ? 1 : 0.98
            }}
            transition={{
                duration: 0.2,
                ease: "easeInOut"
            }}
        >
            {text}
        </motion.button>
    );
};

export default Button; 