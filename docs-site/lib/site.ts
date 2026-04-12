export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'

export const SIMULATOR_URL =
  process.env.NEXT_PUBLIC_SIMULATOR_URL?.replace(/\/$/, '') ?? 'http://localhost:5173'

export const SITE_NAME = 'CAN Simulator Docs'

export const SITE_DESCRIPTION =
  'Learn the CAN bus protocol with an interactive, high-fidelity reference: physical layer, frame format, arbitration, bit timing, and error handling — built for embedded engineers and automotive diagnostics trainees.'
