import { PreSignUpTriggerEvent, PreSignUpTriggerHandler } from 'aws-lambda';

/**
 * Pre-signup trigger to auto-confirm users
 * This skips email verification for development/MVP purposes
 */
export const preSignUp: PreSignUpTriggerHandler = async (
  event: PreSignUpTriggerEvent
) => {
  // Auto-confirm the user
  event.response.autoConfirmUser = true;
  
  // Auto-verify email if provided
  if (event.request.userAttributes.email) {
    event.response.autoVerifyEmail = true;
  }
  
  // Auto-verify phone if provided
  if (event.request.userAttributes.phone_number) {
    event.response.autoVerifyPhone = true;
  }
  
  return event;
};

