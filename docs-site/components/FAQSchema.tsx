'use client'

const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: 'What is CAN?',
    answer:
      'Controller Area Network (CAN) is a serial communication protocol standardized as ISO 11898. It provides multi-master, broadcast messaging over a two-wire differential bus with built-in arbitration, error detection, and automatic retransmission. Originally designed by Robert Bosch GmbH for automotive use, CAN is now used across automotive, industrial, marine, medical, and aerospace domains.',
  },
  {
    question: 'What is the maximum data rate of classical CAN?',
    answer:
      'Classical CAN supports a maximum bit rate of 1 Mbit/s. At this rate the bus length is limited to approximately 40 meters due to propagation delay constraints. Lower bit rates allow longer buses: 500 kbit/s supports ~100 m, and 125 kbit/s supports ~500 m.',
  },
  {
    question: 'What is the difference between CAN and CAN FD?',
    answer:
      'CAN FD (Flexible Data-rate) extends classical CAN with up to 64 bytes per frame (vs 8) and a data-phase bit rate up to 8 Mbit/s (vs 1 Mbit/s). The arbitration phase stays at up to 1 Mbit/s. CAN FD also uses stronger CRC (17-bit or 21-bit vs 15-bit). All nodes on the bus must support FD.',
  },
  {
    question: 'How long can a CAN bus be?',
    answer:
      'Bus length depends on bit rate. At 1 Mbit/s the maximum is ~40 m; at 500 kbit/s ~100 m; at 250 kbit/s ~250 m; at 125 kbit/s ~500 m; at 50 kbit/s ~1000 m. These are ISO guideline values for high-speed CAN (ISO 11898-2).',
  },
  {
    question: 'Why does CAN use a differential pair?',
    answer:
      'A differential pair (CANH and CANL) rejects common-mode noise. Electromagnetic interference couples equally into both wires, and since the receiver measures the difference (CANH minus CANL), the common noise cancels out. This is why CAN works reliably in electrically noisy automotive environments without shielded cable.',
  },
  {
    question: 'What do dominant and recessive mean in CAN?',
    answer:
      'Recessive (logic 1) means both wires sit at ~2.5 V — nobody is driving the bus. Dominant (logic 0) means CANH is pulled to ~3.5 V and CANL to ~1.5 V, creating a ~2.0 V differential. Dominant always overwrites recessive, which is the electrical basis of CAN arbitration.',
  },
  {
    question: 'How does CAN handle priority between nodes?',
    answer:
      'CAN uses non-destructive bitwise arbitration. When multiple nodes transmit simultaneously, each sends its identifier bit-by-bit while reading the bus. If a node sends recessive (1) but reads dominant (0), it has lost and stops immediately. Lower numeric ID = higher priority because dominant (0) overwrites recessive (1).',
  },
  {
    question: 'How many bytes can a CAN frame carry?',
    answer:
      'Classical CAN carries 0 to 8 bytes per frame. CAN FD extends this to 0 to 64 bytes. For messages longer than the frame limit, a transport protocol like ISO-TP (ISO 15765-2) segments and reassembles the data across multiple frames.',
  },
  {
    question: 'What is the sample point in CAN bit timing?',
    answer:
      'The sample point is the moment within each bit time when the CAN controller reads the bus level. It is expressed as a percentage: (1 + TSEG1) / (1 + TSEG1 + TSEG2) × 100. Typical values range from 75% to 87.5%. All nodes on the bus must use the same sample point percentage.',
  },
  {
    question: 'What is UDS?',
    answer:
      'Unified Diagnostic Services (ISO 14229) is the standard diagnostic protocol for passenger vehicles. It provides request/response services for reading data, clearing diagnostic trouble codes, flashing firmware, and controlling ECU behavior. UDS runs over CAN via the ISO-TP transport layer.',
  },
  {
    question: 'What is the difference between CAN and J1939?',
    answer:
      'CAN is the data link and physical layer — it defines how frames get on the wire. J1939 is a complete application-layer protocol for heavy-duty vehicles that runs on top of CAN. J1939 defines message identifiers (PGNs), data definitions (SPNs), address claiming, and its own multi-frame transport, all using CAN 29-bit extended frames.',
  },
]

export function FAQSchema() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
