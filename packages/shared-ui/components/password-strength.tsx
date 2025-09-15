// Password strength indicator component

import * as React from 'react'
import {
  validatePassword,
  type PasswordValidationResult,
} from '@/lib/auth/auth'
import { cn } from '@/lib/utils'
import { CheckCircle, AlertCircle, Info, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface PasswordStrengthProps {
  password: string
  showRequirements?: boolean
  showStrengthBar?: boolean
  showToggle?: boolean
  className?: string
}

const PasswordStrength = React.forwardRef<
  HTMLDivElement,
  PasswordStrengthProps
>(
  (
    {
      password,
      showRequirements = true,
      showStrengthBar = true,
      showToggle = false,
      className,
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false)
    const validation = validatePassword(password)

    const getStrengthColor = (
      strength: PasswordValidationResult['strength']
    ) => {
      switch (strength) {
        case 'weak':
          return 'bg-red-500'
        case 'fair':
          return 'bg-orange-500'
        case 'good':
          return 'bg-yellow-500'
        case 'strong':
          return 'bg-green-500'
        default:
          return 'bg-gray-300'
      }
    }

    const getStrengthText = (
      strength: PasswordValidationResult['strength']
    ) => {
      switch (strength) {
        case 'weak':
          return 'Weak'
        case 'fair':
          return 'Fair'
        case 'good':
          return 'Good'
        case 'strong':
          return 'Strong'
        default:
          return 'None'
      }
    }

    const requirements = [
      {
        text: 'At least 8 characters',
        met: password.length >= 8,
        required: true,
      },
      {
        text: 'One uppercase letter (A-Z)',
        met: /[A-Z]/.test(password),
        required: true,
      },
      {
        text: 'One lowercase letter (a-z)',
        met: /[a-z]/.test(password),
        required: true,
      },
      {
        text: 'One number (0-9)',
        met: /[0-9]/.test(password),
        required: true,
      },
      {
        text: 'At least 12 characters (recommended)',
        met: password.length >= 12,
        required: false,
      },
      {
        text: 'Special characters (!@#$%^&*)',
        met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
        required: false,
      },
    ]

    if (!password) {
      return null
    }

    return (
      <div ref={ref} className={cn('space-y-3', className)}>
        {/* Strength Bar */}
        {showStrengthBar && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Password Strength
              </span>
              <span
                className={cn(
                  'text-sm font-medium',
                  validation.strength === 'weak' && 'text-red-600',
                  validation.strength === 'fair' && 'text-orange-600',
                  validation.strength === 'good' && 'text-yellow-600',
                  validation.strength === 'strong' && 'text-green-600'
                )}
              >
                {getStrengthText(validation.strength)} ({validation.score}/100)
              </span>
            </div>

            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  getStrengthColor(validation.strength)
                )}
                style={{ width: `${validation.score}%` }}
              />
            </div>
          </div>
        )}

        {/* Requirements Checklist */}
        {showRequirements && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">
              Password Requirements
            </h4>
            <div className="space-y-1">
              {requirements.map((req, index) => (
                <div key={index} className="flex items-center text-sm">
                  {req.met ? (
                    <CheckCircle className="mr-2 h-4 w-4 flex-shrink-0 text-green-500" />
                  ) : (
                    <AlertCircle
                      className={cn(
                        'mr-2 h-4 w-4 flex-shrink-0',
                        req.required ? 'text-red-500' : 'text-gray-400'
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      req.met
                        ? 'text-green-700'
                        : req.required
                          ? 'text-red-700'
                          : 'text-gray-500'
                    )}
                  >
                    {req.text}
                    {!req.required && (
                      <span className="ml-1 text-gray-400">(optional)</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Errors */}
        {validation.errors.length > 0 && (
          <div className="rounded-md bg-red-50 p-3">
            <div className="flex">
              <AlertCircle className="mt-0.5 h-4 w-4 text-red-400" />
              <div className="ml-2">
                <h4 className="text-sm font-medium text-red-800">
                  Password Requirements Not Met
                </h4>
                <ul className="mt-1 list-inside list-disc text-sm text-red-700">
                  {validation.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Warnings */}
        {validation.warnings.length > 0 && validation.isValid && (
          <div className="rounded-md bg-yellow-50 p-3">
            <div className="flex">
              <Info className="mt-0.5 h-4 w-4 text-yellow-400" />
              <div className="ml-2">
                <h4 className="text-sm font-medium text-yellow-800">
                  Security Recommendations
                </h4>
                <ul className="mt-1 list-inside list-disc text-sm text-yellow-700">
                  {validation.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Password Toggle (if enabled) */}
        {showToggle && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {showPassword ? 'Hide' : 'Show'} password
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        {/* Security Tips */}
        {validation.isValid && validation.strength === 'strong' && (
          <div className="rounded-md bg-green-50 p-3">
            <div className="flex">
              <CheckCircle className="mt-0.5 h-4 w-4 text-green-400" />
              <div className="ml-2">
                <p className="text-sm text-green-800">
                  <strong>Excellent!</strong> Your password meets all security
                  requirements.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }
)
PasswordStrength.displayName = 'PasswordStrength'

export { PasswordStrength }
