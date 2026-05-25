/**
 * Permanent registration IDs in MySQL — NOT certificate numbers.
 * Certificates are handled separately (e.g. n8n).
 */

export const REGISTRATION_ID_START = 101;

export type RegistrationPeriod = {
  registrationMonth: number;
  registrationYear: number;
  registrationMonthYear: string;
};

/** Today's registration month/year for MySQL (MM = 01–12, year = 4 digits). */
export function registrationPeriodFromDate(date: Date = new Date()): RegistrationPeriod {
  const registrationMonth = date.getMonth() + 1;
  const registrationYear = date.getFullYear();
  const mm = String(registrationMonth).padStart(2, "0");
  return {
    registrationMonth,
    registrationYear,
    registrationMonthYear: `${mm}-${registrationYear}`,
  };
}

/** Individual learner code stored at registration, e.g. "101" */
export function formatIndividualRegistrationCode(identificationNumber: number): string {
  return String(identificationNumber);
}

/** Organisation code at registration, e.g. "101-org" */
export function formatOrganizationRegistrationCode(identificationNumber: number): string {
  return `${identificationNumber}-org`;
}

export function describeRegistrationIdStorage(): string {
  return (
    "Registration: identificationNumber from 101; registrationMonth, registrationYear, " +
    "registrationMonthYear (MM-YYYY) set automatically on signup."
  );
}
