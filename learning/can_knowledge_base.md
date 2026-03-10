# CAN Protocol Simulator — Comprehensive Knowledge Base

> **Sources:** ISO 11898:2024 + CSS Electronics CAN Bus Intro [2025] + Kvaser + HMS Networks | Last updated: March 2026

> **For the CAN-Simulator project** | Last updated: March 2026 | Based on ISO 11898:2024

---

## Table of Contents

1. [Introduction & History](#1-introduction--history)
2. [Standards Landscape (ISO 11898 Family)](#2-standards-landscape-iso-11898-family)
3. [Protocol Generations: Classic CAN → FD → XL](#3-protocol-generations)
4. [CAN Frame Structure](#4-can-frame-structure)
5. [Arbitration — Non-Destructive Bus Access](#5-arbitration)
6. [Bit Timing & Synchronization](#6-bit-timing--synchronization)
7. [Error Handling & Fault Confinement](#7-error-handling--fault-confinement)
8. [Physical Layer, Wiring & Bus Topology](#8-physical-layer-wiring--bus-topology)
9. [Higher-Layer Protocols](#9-higher-layer-protocols)
10. [Diagnostics — OBD-II, UDS & DTC](#10-diagnostics--obd-ii-uds--dtc)
11. [DBC Signal Decoding Workflow](#11-dbc-signal-decoding-workflow)
12. [Open-Source Tools & Simulators](#12-open-source-tools--simulators)
13. [Real-World Applications](#13-real-world-applications)
14. [Implementing a CAN Simulator (Design Guide)](#14-implementing-a-can-simulator)
15. [Performance Optimization & Best Practices](#15-performance-optimization--best-practices)
16. [Curated References & Further Reading](#16-curated-references--further-reading)

---

## 1. Introduction & History

**Controller Area Network (CAN)** is a robust, multi-master serial bus standard originally developed by **Robert Bosch GmbH** in **1983**, publicly released in **1986**, and standardized by **ISO as ISO 11898** in 1993.

### Why CAN Exists

Before CAN, vehicles used point-to-point wiring harnesses connecting every electronic module to every other. A modern vehicle without CAN would require **hundreds of kilometres of wire**. CAN replaced this with a shared 2-wire differential bus, allowing all **Electronic Control Units (ECUs)** to communicate without a central host.

### Intuitive Analogy (CSS Electronics)

Think of CAN bus as the **nervous system** of a vehicle:
- The **CAN bus** = nervous system (enables communication)
- **ECUs** (CAN nodes) = body parts (interconnected, sensing and sharing data)

In physical terms, all ECUs share a single **two-wire bus** — a twisted pair:
- **CAN High (CANH)** — yellow wire (like the sun)
- **CAN Low (CANL)** — green wire (like the grass)

### Core Design Principles

| Principle | Detail |
|---|---|
| **Multi-master** | Any node can initiate a transmission; no single master required |
| **Broadcast** | All nodes see every message; each decides whether to act on it |
| **Priority-based** | Lower numerical ID = higher priority; resolved non-destructively |
| **Fault-tolerant** | Built-in error detection, retransmission, and node isolation |
| **Noise-immune** | Differential signalling (CANH/CANL) rejects common-mode noise |

### ECU Internal Architecture

Every ECU on a CAN bus consists of three primary elements:

| Component | Role |
|---|---|
| **Microcontroller (MCU)** | The "brain" — interprets incoming messages and decides what to transmit (e.g. broadcast oil temperature at 5 Hz) |
| **CAN Controller** | Integrated in the MCU; handles protocol compliance — encoding, error detection, arbitration. Removes complexity from the MCU |
| **CAN Transceiver** | Bridges the CAN controller to the physical wires; converts digital signals to/from differential CANH/CANL signals; provides electrical protection |

A modern car can easily have **70+ ECUs**, each sharing information with others on the bus.

### CAN DB9 Connector

There is no single mandatory connector across all CAN bus applications. However, the **CAN DB9 (D-sub9) connector** (defined in CANopen CiA 303-1) has become the de facto standard for many applications including CAN data loggers and interface devices.

### OSI Layer Mapping

```
OSI Layer          | CAN Coverage
──────────────────────────────────────────
7 Application      | CANopen, J1939, UDS, OBD-II, AUTOSAR COM
6 Presentation     | DBC signal encoding/decoding
5 Session          | UDS diagnostic sessions
4 Transport        | ISO-TP (ISO 15765-2)
3 Network          | Not defined by CAN
2 Data Link        | ISO 11898-1 (frame format, arbitration, error)
1 Physical         | ISO 11898-2/-3 (voltage levels, cable, connectors)
```

---

## 1a. Top 4 Benefits of CAN Bus (CSS Electronics)

#### 1. Simple & Low Cost
- Replaces complex point-to-point wiring with a single shared bus → reduces errors, weight, and cost
- Reduced wire complexity: Traditional wiring requires dedicated lines between every pair of related nodes
- **Weight reduction:** Switching to CAN bus can reduce a vehicle's wiring harness weight by **up to 20 kg**, cutting fuel costs
- Scale: The enormous CAN ecosystem reduces costs for controllers, transceivers, harnesses, and tooling

#### 2. Easy Access
- CAN provides **one point-of-entry** to communicate with all ECUs simultaneously → central diagnostics, logging, and configuration
- **Silent CAN logging:** A logger can be connected anywhere on the bus in silent/listen-only mode without disturbing traffic — critical for diagnostics
- **ECU flashing:** Firmware updates can be broadcast over CAN using higher-layer protocols (UDS, CCP/XCP)
- Standardized higher-layer protocols (J1939, OBD-II, CANopen) enable interoperability across brands and tools

#### 3. Extremely Robust
- Differential signalling: EMI affects both wires equally, so the differential is immune to common-mode noise
- Error handling: 5 error detection methods (bit, stuff, CRC, form, ACK) with automatic retransmission
- Error confinement: faulty nodes automatically reduce activity or go bus-off to protect the network

#### 4. Efficient
- Priority-based arbitration: lowest CAN ID wins → safety-critical messages always get immediate bus access
- Bandwidth utilization: lower-priority messages fill idle gaps between high-priority messages
- Classical CAN at 1 Mbit/s can handle **thousands of CAN frames per second** — sufficient for most automotive/industrial use cases today

---

## 2. Standards Landscape (ISO 11898 Family)

| Standard | Scope | Key Limits |
|---|---|---|
| **ISO 11898-1:2024** | Data link layer + physical coding sub-layer | Classic / FD / XL frame formats; XL payload up to 2048 bytes |
| **ISO 11898-2:2024** | High-speed physical layer | Up to **20 Mbit/s** (CAN XL with SIC transceivers); 120 Ω termination |
| **ISO 11898-3** | Fault-tolerant low-speed physical layer | Up to **125 kbit/s**; survives single-wire fault |

> [!IMPORTANT]
> ISO 11898-2:2024 (released March 2024) raised the maximum transceiver speed from 5 Mbit/s to **20 Mbit/s**, bridging CAN XL with 100BASE-T1 Ethernet-class bandwidth.

---

### Complete ISO 11898 Timeline (CSS Electronics)

| Year | Milestone |
|---|---|
| Pre-1986 | Car ECUs relied on complex point-to-point wiring |
| **1986** | Bosch developed the CAN protocol as a solution |
| **1991** | Bosch published CAN 2.0 (2.0A: 11-bit, 2.0B: 29-bit) |
| **1993** | CAN adopted as international standard — **ISO 11898** |
| **2003** | ISO 11898 becomes a multi-part standard series |
| **2012** | Bosch released **CAN FD 1.0** (flexible data rate) |
| **2015** | CAN FD standardised — ISO 11898-1 |
| **2016** | Physical layer for data rates up to 5 Mbit/s standardised in ISO 11898-2 |
| **2018** | CAN in Automation (CiA) starts CAN XL development |
| **2024** | **CAN XL standardised** — ISO 11898-1:2024 & 11898-2:2024 |

Today, CAN is standard in cars, trucks, buses, tractors, ships, planes, EV batteries, and industrial machinery.

### The Future of CAN (Practical Perspective from CSS Electronics)

Three major trends will shape CAN bus's future:

1. **Need for speed:** Demand for higher data rates may drive transition towards CAN FD, CAN XL, or Automotive Ethernet
2. **Connected vehicles:** Rise of cloud computing and telematics enables predictive maintenance and remote updates — but also introduces cybersecurity risks
3. **Open vs. closed:** Push towards open-source/Right-to-Repair vs. OEM-driven proprietary microservices

> [!IMPORTANT]
> **Real-world adoption caution (CSS Electronics, 2024):** Across 10,000+ customers, less than **0.1% of use cases involve CAN FD** and **0% involve CAN XL** as of 2024. CAN FD was predicted to replace Classical CAN by 2019–2020; while it exists in new vehicles, it has **not displaced Classical CAN**. Automotive Ethernet is growing in frontier OEM R&D but has not yet impacted Classical CAN's dominance in vehicles on the road.

### Non-CAN Automotive Networks (Companion Technologies)

| Protocol | Speed | Use Case |
|---|---|---|
| **LIN bus** | Up to 20 kbit/s | Low-cost sub-networks (AC, doors, seats); 1 master + up to 16 slaves |
| **FlexRay** | Up to 10 Mbit/s | Safety-critical redundant channels (ISO 17458); costly but deterministic |
| **Automotive Ethernet** | 100 Mbit/s–10 Gbit/s | ADAS, cameras, infotainment; high bandwidth, less CAN safety features |

---

## 3. Protocol Generations

### 3.1 Classical CAN (CAN 2.0A / 2.0B)

| Property | Value |
|---|---|
| Bit rate | Up to **1 Mbit/s** |
| Identifier | 11-bit (2.0A) or 29-bit extended (2.0B) |
| Data payload | **0–8 bytes** |
| CRC | 15-bit |
| Standardised | ISO 11898-1 (original) |

### 3.2 CAN FD — Flexible Data-Rate (ISO 11898-1:2015)

Introduced by Bosch in 2012 to overcome the 8-byte payload bottleneck.

| Property | Value |
|---|---|
| Arbitration bit rate | Same as Classic (≤ 1 Mbit/s) |
| Data bit rate | Up to **5 Mbit/s** (8 Mbit/s with SIC transceivers) |
| Data payload | **0–64 bytes** |
| CRC | 17-bit (≤16 bytes) or 21-bit (>16 bytes) |
| New control bits | FDF (Flexible Data Format), BRS (Bit Rate Switch), ESI (Error State Indicator) |
| Backward compat. | Can co-exist, but Classic nodes may generate error frames on FD messages |

### 3.3 CAN XL — eXtra Large (ISO 11898-1:2024 / CiA 610-1)

Third generation, designed to bridge CAN and Ethernet in software-defined vehicles (SDVs).

| Property | Value |
|---|---|
| Arbitration bit rate | ≤ 1 Mbit/s |
| Data bit rate | Up to **20 Mbit/s** (with SIC XL transceivers) |
| Data payload | **1–2048 bytes** |
| New fields | 32-bit Acceptance Field (AF), 8-bit Virtual CAN Network ID (VCID) |
| Tunneling | Can carry Ethernet frames inside CAN XL payloads |
| Backward compat. | XL controllers handle Classic, FD, and XL simultaneously |

### Comparison Table

| Feature | Classic CAN | CAN FD | CAN XL |
|---|---|---|---|
| Max data rate | 1 Mbit/s | 5–8 Mbit/s | **20 Mbit/s** |
| Max payload | 8 bytes | 64 bytes | **2048 bytes** |
| CRC protection | 15-bit | 17/21-bit | 17/21-bit improved |
| Multi-frame protocol | ISO 15765-2 | ISO 15765-2 | Native large frames |
| Ethernet tunneling | No | No | **Yes** |
| Multi-bus (VCID) | No | No | **Yes (256 nets)** |

---

## 4. CAN Frame Structure

### 4.1 Frame Types

| Frame Type | Purpose |
|---|---|
| **Data Frame** | Carries payload from transmitter to all nodes |
| **Remote Frame** | Requests a data frame from another node (same ID) |
| **Error Frame** | Signals detection of an error condition |
| **Overload Frame** | Requests additional inter-frame delay |

### 4.2 Standard Data Frame (Classical CAN, 11-bit ID)

```
┌─────┬──────────────────────────┬─────────┬───────────────┬──────────┬──────────┬─────┬───┐
│ SOF │  ARBITRATION FIELD       │ CONTROL │  DATA FIELD   │   CRC    │   ACK    │ EOF │IFS│
│  1  │ ID[10:0] (11-bit) │ RTR  │IDE│r│DLC│  0–8 bytes    │ 15+1 bit │ ACK+DEL  │  7  │ 3 │
└─────┴──────────────────────────┴─────────┴───────────────┴──────────┴──────────┴─────┴───┘
```

### 4.3 Field Descriptions

| Field | Length | Description |
|---|---|---|
| **SOF** (Start of Frame) | 1 bit dominant | Hard synchronisation trigger for all receivers |
| **Identifier (ID)** | 11 or 29 bits | Message priority (lower number = higher priority) |
| **RTR** (Remote Transmission Request) | 1 bit | Dominant = data frame; recessive = remote frame |
| **IDE** (Identifier Extension) | 1 bit | Dominant = standard 11-bit; recessive = extended 29-bit |
| **DLC** (Data Length Code) | 4 bits | Number of data bytes (0–8 Classic; 0–64 FD) |
| **Data Field** | 0–8 bytes | Actual payload |
| **CRC** | 15 bits | Polynomial: x¹⁵+x¹⁴+x¹⁰+x⁸+x⁷+x⁴+x³+1 |
| **CRC Delimiter** | 1 bit recessive | Marks end of CRC |
| **ACK Slot** | 1 bit | Transmitter sends recessive; receivers pull dominant if OK |
| **ACK Delimiter** | 1 bit recessive | Marks end of ACK |
| **EOF** | 7 bits recessive | End of frame |
| **IFS** | ≥3 bits recessive | Interframe space — bus idle between frames |

### 4.4 Bit Stuffing

To maintain synchronisation, after **5 consecutive bits of the same polarity**, a **complementary stuff bit** is automatically inserted by the transmitter (and removed by receivers). A sequence of 6 identical bits without the stuff bit is a **Bit Stuffing Error**.

$$\text{Worst-case overhead} = \frac{n}{5} \text{ additional bits for } n \text{ data bits}$$

---

## 5. Arbitration

### How Non-Destructive Arbitration Works

CAN uses a **wired-AND bus logic** where a dominant bit (0) always overrides a recessive bit (1). This enables non-destructive arbitration:

```
Timeline →
Node A transmits:  1 1 0 1 1 0 0 ...
Node B transmits:  1 1 0 1 0 ...
                              ↑ Node B sees dominant (from A) while sending recessive
                                → Node B loses arbitration, becomes a receiver
Bus level:         1 1 0 1 1 0 0 ...  ← Node A's message continues uninterrupted
```

### Arbitration Rules

1. Nodes monitor the bus while transmitting their identifier, bit by bit (MSB first).
2. If a node transmits **recessive** but reads **dominant**, it has been overridden — it immediately stops transmitting and switches to receive mode.
3. The node with the **numerically lowest identifier** wins (most dominant bits early in the ID field).
4. Losers re-attempt transmission after the current frame completes.
5. Data frames beat remote frames with the same ID (RTR bit: dominant < recessive).

> [!TIP]
> In your simulator, model arbitration by assigning timestamps and resolving which message wins based on the bit-by-bit comparison of IDs. Display "lost arbitration" events as animated node state transitions.

---

## 6. Bit Timing & Synchronization

### 6.1 Time Quanta (TQ)

The smallest time unit in CAN, derived from the node's oscillator:
$$TQ = \frac{n}{f_{osc}}$$

### 6.2 Nominal Bit Time Segments

Each bit is divided into 4 segments:

```
|← Nominal Bit Time (NBT) →|
┌──────────┬────────────────┬──────────────────┬──────────────────┐
│ Sync_Seg │   Prop_Seg     │   Phase_Seg1     │   Phase_Seg2     │
│   1 TQ   │  1–8 TQ        │  1–8 TQ          │  2–8 TQ          │
└──────────┴────────────────┴──────────────────┴──────────────────┘
                                               ↑ SAMPLE POINT
```

| Segment | TQ Range | Purpose |
|---|---|---|
| **Sync_Seg** | 1 TQ (fixed) | Edge expected here for synchronisation |
| **Prop_Seg** | 1–8 TQ | Compensates bus propagation delay (round-trip) |
| **Phase_Seg1** | 1–8 TQ | Lengthened to absorb positive phase errors |
| **Phase_Seg2** | 2–8 TQ | Shortened to absorb negative phase errors |

### 6.3 Sample Point

Typically placed at **87.5% of the bit time** (end of Phase_Seg1). Best practice: place between 75–80% for higher bit rates where propagation delay is a larger fraction of bit time.

### 6.4 Synchronization Mechanisms

| Type | Trigger | Action |
|---|---|---|
| **Hard Sync** | SOF recessive→dominant edge | Resets bit time to Sync_Seg start |
| **Resync** | Any recessive→dominant edge during frame | Adjusts Phase_Seg1 or Phase_Seg2 by ±SJW |

**Synchronization Jump Width (SJW):** Maximum TQ correction per resync (1–4 TQ). Larger SJW tolerates more clock drift but reduces noise immunity.

### 6.5 Common Bit Rate Configurations

| Bit Rate | Typical TQ Count | Max Bus Length |
|---|---|---|
| 1 Mbit/s | 8–10 TQ at 8 MHz | ~40 m |
| 500 kbit/s | 16–20 TQ | ~100 m |
| 250 kbit/s | 16–20 TQ | ~250 m |
| 125 kbit/s | 16–20 TQ | ~500 m |

---

## 7. Error Handling & Fault Confinement

### 7.1 Error Detection Methods (5 Types)

| Error Type | Detection Mechanism |
|---|---|
| **Bit Error** | Transmitter monitors bus; read bit ≠ sent bit (outside arbitration/ACK) |
| **Bit Stuffing Error** | 6 consecutive identical bits detected |
| **CRC Error** | Receiver's computed CRC ≠ transmitted CRC |
| **Form Error** | Fixed-format field (CRC delimiter, ACK delimiter, EOF) contains wrong bits |
| **ACK Error** | Transmitter sees no dominant ACK after broadcasting a frame |

### 7.2 Error Frames

When a node detects any error, it immediately transmits an **Error Flag** to abort the message:

```
Active Error Flag:   6 dominant bits  ← Violates bit stuffing, all nodes detect it
Passive Error Flag:  6 recessive bits ← Does not disrupt other traffic
Error Delimiter:     8 recessive bits
```

After an error frame, nodes discard the corrupt frame and the transmitter re-sends automatically.

### 7.3 Error State Machine

```
                TEC or REC > 127          TEC > 255
  Error Active ────────────────► Error Passive ──────────► Bus-Off
  (TEC/REC < 128)               (TEC/REC > 127)           (TEC > 255)
       ▲                              │                        │
       │         TEC/REC ≤ 127        │    128× 11 recessive   │
       └──────────────────────────────┘    bits (recovery)     │
       ←────────────────────────────────────────────────────────┘
```

### 7.4 Error Counter Rules (Simplified)

| Event | TEC change | REC change |
|---|---|---|
| Transmitter detects error | +8 | — |
| Receiver detects error | — | +1 |
| Successful transmission | −1 | — |
| Successful reception | — | −1 (floor 0) |

> [!WARNING]
> A node in **Bus-Off** state stops all activity. Recovery requires a manual reset sequence (128 occurrences of 11 consecutive recessive bits). Simulate this state machine explicitly — it's critical for realism.

---

## 8. Physical Layer, Wiring & Bus Topology

### 8.1 Electrical Characteristics (ISO 11898-2, High Speed)

| State | CANH Voltage | CANL Voltage | Differential (CANH−CANL) |
|---|---|---|---|
| **Recessive (1)** | ~2.5 V | ~2.5 V | ~0 V |
| **Dominant (0)** | ~3.5 V | ~1.5 V | ~2.0 V |

Receivers interpret differential of **< 0.5 V** as recessive, **> 0.9 V** as dominant (with hysteresis).

### 8.2 Cable Requirements

| Parameter | Specification |
|---|---|
| Cable type | **Twisted pair**, 120 Ω characteristic impedance |
| Shielding | Recommended in EMI-heavy environments (vehicles, industrial) |
| Encoding | Non-Return-to-Zero (NRZ) |
| Stub length | **< 30 cm** from main bus to node connector |

### 8.3 Bus Topology

CAN mandates a **linear (daisy-chain) topology**:

```
ECU1 ─────┬─────── ECU2 ──────── ECU3 ──────── ECU4
[120Ω]   bus                                  [120Ω]
terminator                                  terminator
```

> [!CAUTION]
> **Star and ring topologies are NOT supported** for high-speed CAN. Signal reflections from multiple endpoints cause data corruption. Use CAN repeaters/bridges for star configurations.

### 8.4 Termination

- Two **120 Ω resistors** at the extreme ends of the linear bus.
- Combined parallel resistance = **60 Ω** (measurable with a multimeter with bus powered off).
- Without termination: signal reflections → increased error rate → nodes may go bus-off.
- **Split termination**: Two 60 Ω resistors with a 4.7 nF capacitor to ground between them — improves EMC balance.

### 8.5 Bus Length vs Bit Rate

The bit time must be longer than twice the bus propagation delay (round-trip). Rule of thumb: **5 ns/m** for typical CAN cable.

| Bit Rate | Max Length |
|---|---|
| 1 Mbit/s | **40 m** |
| 500 kbit/s | 100 m |
| 250 kbit/s | 250 m |
| 125 kbit/s | 500 m |
| 10 kbit/s | 5000 m |

---

## 9. Higher-Layer Protocols

CAN's data link layer is intentionally minimal. Industry-specific higher-layer protocols (HLPs) define message content and node behaviour:

| Protocol | Domain | Key Features |
|---|---|---|
| **OBD-II** | Automotive diagnostics | Standardised PIDs, DTC reading, emissions testing (post-1996 cars) |
| **CANopen** (CiA 301) | Industrial automation, robotics | Object Dictionary, PDO/SDO, NMT state machine |
| **DeviceNet** | Factory PLC networks | Built on CANopen; Allen-Bradley origin |
| **J1939** | Heavy vehicles, trucks, buses, off-road | 29-bit IDs, PGN/SPN encoding, SAE standard |
| **ISOBUS** (ISO 11783) | Agriculture machinery | J1939 extension for tractors and implements |
| **NMEA 2000** | Marine electronics | J1939 derivative for nav instruments |
| **ISO 15765-2 (ISO-TP)** | Automotive diagnostics | Multi-frame transport for UDS over CAN |
| **UDS (ISO 14229)** | Universal diagnostics | Layers on ISO-TP; standard ECU diagnostic services |
| **LIN** (companion) | Low-speed sub-networks | Single-wire, master-slave; connects to CAN via gateway |
| **CCP/XCP** | ECU calibration & measurement | Read/write ECU memory for calibration, measurement, flashing |
| **ARINC 825** | Aerospace | CAN-based protocol for avionics (aircraft systems) |
| **UAVCAN** | Drones / Aerospace / Robotics | Open-source, lightweight; widely used in UAV flight controllers |
| **MilCAN** | Military vehicles | Deterministic CAN for harsh military environments |
| **SafetyBUS p** | Safety-critical industrial | Used in car production, cable cars; certified safety protocol |
| **HVAC CAN** | Building/vehicle HVAC | CAN for Heating, Ventilation and Air Conditioning systems |

### The Language Analogy (CSS Electronics)

CAN bus is like **vocal chords and the ability to make sounds** — it defines the physical medium and basic rules. Higher-layer protocols are like **different languages** (German, English) that use those basics to build meaningful sentences.

Key implications:
- There is **always** a higher-layer protocol in use in real applications — without one, messages are meaningless noise
- **Thousands of HLPs exist** — many are manufacturer/application-specific ("custom protocols")
- A CAN logger can **record** any CAN traffic; you need the **DBC/HLP** to **understand** it
- A vehicle may run multiple HLPs simultaneously on the same bus (e.g. a proprietary ECU protocol + OBD-II for diagnostics)

---

## 10. Diagnostics — OBD-II, UDS & DTC

### 10.1 OBD-II Overview

**On-Board Diagnostics II (OBD-II)** is a US-mandated standardised diagnostic interface (1994/1996). It standardised:
- The 16-pin **DLC connector** location (under dashboard)
- **Mode 01 PIDs** for emissions-related data
- **Generic DTCs** shared across manufacturers

Modern successor: **OBDonUDS (SAE J1979-2)** — mandatory for US vehicles from **2027**, merging OBD with UDS capabilities.

### 10.2 UDS (ISO 14229) Service Table

UDS provides a client–server model (tester = client, ECU = server). The **Service Identifier (SID)** is a 1-byte field in each request:

| SID | Service | Common Use |
|---|---|---|
| `0x10` | DiagnosticSessionControl | Enter default, extended, or programming session |
| `0x11` | ECUReset | Soft/hard reset ECU |
| `0x14` | ClearDiagnosticInformation | Erase DTCs and freeze frames |
| `0x19` | ReadDTCInformation | Query stored, pending, confirmed DTCs |
| `0x22` | ReadDataByIdentifier | Read live values (VIN, temperatures, SOC) by DID |
| `0x23` | ReadMemoryByAddress | Read raw ECU memory |
| `0x27` | SecurityAccess | Seed/key challenge-response authentication |
| `0x28` | CommunicationControl | Enable/disable Tx/Rx on target ECU |
| `0x2E` | WriteDataByIdentifier | Write configuration parameters |
| `0x2F` | InputOutputControlByIdentifier | Override actuators for testing |
| `0x31` | RoutineControl | Trigger self-tests, calibrations, coding |
| `0x34` | RequestDownload | Begin firmware/data download |
| `0x36` | TransferData | Chunk-based data transfer |
| `0x37` | RequestTransferExit | Finalise data transfer |
| `0x3E` | TesterPresent | Keep diagnostic session alive (heartbeat) |

**Response SID = Request SID + 0x40**. Negative responses use SID `0x7F` followed by the original SID and a **Negative Response Code (NRC)**.

### 10.3 Key NRC Codes

| NRC | Name | Meaning |
|---|---|---|
| `0x10` | generalReject | Generic failure |
| `0x11` | serviceNotSupported | SID not implemented |
| `0x12` | subFunctionNotSupported | Sub-function invalid |
| `0x13` | incorrectMessageLengthOrInvalidFormat | Wrong DLC |
| `0x22` | conditionsNotCorrect | Preconditions not met |
| `0x24` | requestSequenceError | Wrong session or order |
| `0x25` | noResponseFromSubnetComponent | Sub-ECU unreachable |
| `0x31` | requestOutOfRange | DID/address out of bounds |
| `0x33` | securityAccessDenied | Auth failed |
| `0x35` | invalidKey | Seed/key mismatch |
| `0x36` | exceededNumberOfAttempts | Brute-force lockout |
| `0x37` | requiredTimeDelayNotExpired | Must wait before retrying |
| `0x78` | requestCorrectlyReceivedResponsePending | ECU processing (retry later) |

### 10.4 ISO 15765-2 (ISO-TP) Transport

UDS messages longer than 8 bytes are segmented by ISO-TP:

| Frame Type | ID byte | Purpose |
|---|---|---|
| Single Frame (SF) | `0x0_` | Complete message ≤ 7 bytes |
| First Frame (FF) | `0x1_` | First segment of multi-frame, includes total length |
| Consecutive Frame (CF) | `0x2_` | Subsequent segments, sequence number `0-F` |
| Flow Control (FC) | `0x3_` | Receiver tells sender: block size + separation time |

### 10.5 DTC Format

UDS DTCs are **3 bytes** (vs OBD-II's 2-byte):
```
Byte 1: High byte of DTC  (e.g., 0xC0 = powertrain)
Byte 2: Low byte of DTC
Byte 3: Failure Mode Indicator (FMI / Status Byte)
         Bits: testFailed, testFailedThisMonitoringCycle,
               pendingDTC, confirmedDTC, etc.
```

---

## 11. DBC Signal Decoding Workflow

*Source: [CSS Electronics CAN Bus Intro](https://www.csselectronics.com/pages/can-bus-simple-intro-tutorial)*

Raw CAN bus data is **not human-readable**. Decoding requires a DBC file and a software tool.

### Step 1 — Understand CAN Signal Extraction

Each CAN data frame carries multiple **CAN signals** packed into the data payload.

To extract a signal's physical value, you need these 5 parameters:

| Parameter | Description |
|---|---|
| **Byte order** | Intel (little-endian) or Motorola (big-endian) |
| **Bit start** | The bit position where the signal begins |
| **Bit length** | Number of bits used for this signal |
| **Scale** | Multiply the raw integer by this factor |
| **Offset** | Add this value after scaling |

```
Physical Value = (raw_decimal_value × Scale) + Offset
```

Example — extracting engine RPM from CAN ID `0x0C0`, bytes 0–1:
```
Raw bytes: 0x00 0x0F         → raw decimal = 15
Scale = 0.25 rpm/bit, Offset = 0
Physical value = 15 × 0.25 = 3.75 RPM  (unrealistic, just illustrative)
```

### Step 2 — Get the Relevant DBC File

A **DBC file** (CAN database, `.dbc`) is a structured text file that maps raw CAN IDs and bit positions to named signals with scaling info.

| Route | When to Use |
|---|---|
| **OEM-provided DBC** | If you are the OEM or work for one — the authoritative source |
| **Product documentation** | Many CAN-enabled sensor/module products include a DBC |
| **Standardised DBCs** | J1939 DBC covers 60–80% of heavy-duty vehicle signals across makes |
| **Reverse engineering** | For cars/EVs: community-sourced DBCs (e.g. via SavvyCAN, comma.ai) |
| **Sensor-to-CAN modules** | Add external sensors (GPS, temperature, analog) with known DBC |

### Step 3 — Use a Software / API Tool

| Tool | Type | Best For |
|---|---|---|
| **asammdf GUI** | Desktop | Ad hoc analysis, diagnostics, MF4/MDF4 export |
| **Grafana + InfluxDB** | Dashboard | Time-series visualisation, fleet dashboards |
| **Python (cantools + python-can)** | Script | Statistical analysis, big data, automation |
| **MATLAB** | Script | Engineering analysis, signal processing |
| **SavvyCAN** | Desktop | Reverse engineering, live monitoring |

---

## 12. Open-Source Tools & Simulators

### 12.1 Python Ecosystem

| Tool | Description | GitHub |
|---|---|---|
| **python-can** | Unified CAN bus API; supports SocketCAN, PEAK, Kvaser, Vector, SLCAN | [python-can/python-can](https://github.com/hardbyte/python-can) |
| **cantools** | DBC/KCD/ARXML parsing; signal encode/decode; CLI | [cantools/cantools](https://github.com/cantools/cantools) |
| **udsoncan** | Pure-Python UDS client/server library | [pylessard/python-udsoncan](https://github.com/pylessard/python-udsoncan) |
| **can-isotp** | ISO-TP transport layer over python-can | [pylessard/python-can-isotp](https://github.com/pylessard/python-can-isotp) |

**Minimal simulation scaffold (python-can):**
```python
import can, time

bus = can.interface.Bus(interface='virtual', channel='vcan0')

# Simulate an ECU sending engine RPM at 500 kbit/s
msg = can.Message(arbitration_id=0x0C0, data=[0x00, 0x0F, 0xA0], is_extended_id=False)
while True:
    bus.send(msg)
    time.sleep(0.01)   # 100 Hz
```

### 12.2 GUI & Analysis Tools

| Tool | Platform | Features |
|---|---|---|
| **SavvyCAN** | Windows/Mac/Linux | Reverse engineering, frame logging, GVRET/SocketCAN |
| **BUSMASTER** | Windows | Open-source; signal monitoring, node simulation, J1939 |
| **CANdevStudio** (GENIVI) | Linux | Drag-and-drop node composition, plugin-based |
| **Kayak** | Cross-platform (Java) | Bus monitoring with DBC support |
| **cangaroo** | Linux | Qt-based lightweight CAN monitor |

### 12.3 Linux SocketCAN Setup (for backend simulation)

```bash
# Load virtual CAN module
sudo modprobe vcan
sudo ip link add dev vcan0 type vcan
sudo ip link set up vcan0

# Monitor traffic
candump vcan0

# Inject a frame
cansend vcan0 0CF00400#DEADBEEF01020304

# Replay a log file
canplayer -I candump.log
```

### 12.4 Simulator-Specific Tools

| Tool | Purpose |
|---|---|
| **ICSim** | Instrument cluster simulator with SocketCAN; useful for CAN security education |
| **UDSim** | UDS protocol simulator and fuzzer (SocketCAN-based) |
| **openCanSuite** | Multi-tool suite: analyser, simulation, visualisation |
| **CANdb++ / DBC Editor** | Proprietary but widely used for signal databases |

### 12.5 Hardware Interfaces for Real-World Testing

| Device | Interface | Notes |
|---|---|---|
| **PEAK PCAN-USB** | USB↔CAN | Windows/Linux; PCAN-Basic API |
| **Kvaser Leaf Light** | USB↔CAN | Multi-OS; Kvaser CANlib |
| **Canable** (open hardware) | USB↔CAN | SocketCAN-compatible; low cost |
| **Raspberry Pi + MCP2515** | SPI↔CAN | Embedded simulation node |
| **Vector VN-series** | USB/PCIe↔CAN | Professional; XL-Driver API |

---

## 13. Real-World Applications

### 13.1 Automotive

| System | CAN Role |
|---|---|
| Engine Control Unit (ECU) | Real-time fuel, ignition, emissions control |
| Anti-lock Braking System (ABS) | Wheel speed sensor data; brake pressure commands |
| Electronic Stability Control | Lateral acceleration, yaw rate, steering angle |
| Airbag System | Crash severity detection, deployment sequencing |
| Battery Management System (BMS) | Cell voltages, temperatures, SOC in EVs |
| ADAS (adaptive cruise, lane keep) | Radar/camera data fusion, actuator commands |
| Instrument Cluster | Speedometer, fuel gauge, warning lights (often 125 kbit/s) |
| Infotainment Gateway | Bridges high-speed powertrain CAN to multimedia CAN |

> Modern vehicles have **5–10 separate CAN buses** segmented by function (powertrain, chassis, body, ADAS, infotainment) and bridged by a **Central Gateway ECU**.

### 13.2 Industrial

| Domain | Protocol | Application |
|---|---|---|
| Robotics / Motion control | **CANopen** DS402 | Joint position, velocity, torque profiles |
| Factory automation | **DeviceNet** | PLC ↔ sensor/actuator communication |
| Agriculture | **ISOBUS (ISO 11783)** | Tractor ↔ implement (planter, sprayer) |
| Heavy vehicles / fleet | **SAE J1939** | Engine load, fuel rate, fault codes (DM1) |
| Railway | **CANopen / proprietary** | Door control, braking, HVAC, diagnostics |
| Wind turbines | **CANopen** | Pitch controller, condition monitoring |

### 13.3 Medical Devices

| Device | Use of CAN |
|---|---|
| MRI / CT Scanner | Gantry position, cooling system coordination |
| Ventilator | Synchronised sensor/actuator feedback loops |
| Dialysis Machine | Blood pump, pressure monitoring, toxin level control |
| Surgical Robot | Multi-joint actuator coordination, haptic feedback |
| Infusion Pump | Precise flow rate control, occlusion detection |

**Key medical advantage:** CAN's built-in error confinement means a faulty sub-module is isolated without crashing the whole device — critical for patient safety.

---

## 14. Implementing a CAN Simulator

### 14.1 Architecture Blueprint

```
┌──────────────────────────────────────┐
│           SIMULATOR CORE (Service)   │
│                                      │
│  ┌──────────┐   ┌───────────────┐    │
│  │ Virtual  │   │  Protocol     │    │
│  │ CAN Bus  │◄──│  Engine       │    │
│  │ (pub/sub)│   │  (bit timing, │    │
│  └────┬─────┘   │  arbitration, │    │
│       │         │  error FSM)   │    │
│       │         └───────────────┘    │
│  ┌────▼──────────────────────────┐   │
│  │      Node Simulator Pool      │   │
│  │  ECU1  ECU2  ECU3  GatewayECU │   │
│  └───────────────────────────────┘   │
└──────────────────────────────────────┘
          │ Event stream
┌─────────▼──────────────────────────────┐
│           REACT UI LAYER               │
│  Frame Inspector │ Bus Load Monitor    │
│  Arbitration Viz │ Error State View    │
│  Bit Timing Calc │ Signal Decoder      │
│  UDS Tester      │ Capture/Replay      │
└────────────────────────────────────────┘
```

### 14.2 Key Simulation Modules to Build

1. **Frame Generator** — Constructs raw bit-level frames (SOF, ID, RTR, IDE, DLC, data, CRC, ACK, EOF, stuffing)
2. **CRC Engine** — CRC-15 for Classic, CRC-17/21 for FD
3. **Arbitration Resolver** — Bit-by-bit wired-AND for concurrent transmitters
4. **Bit Timing Calculator** — Interactive TQ/segment configuration with validation
5. **Error State Machine** — Per-node TEC/REC counters; Active/Passive/Bus-Off transitions
6. **ISO-TP Segmenter** — Break long UDS messages into SF/FF/CF/FC sequences
7. **UDS Request Handler** — SID dispatch table; session management; security access FSM
8. **DBC Signal Decoder** — Parse `.dbc` files; map CAN signals to physical values

### 14.3 CRC-15 Reference Implementation (TypeScript)

```typescript
const CAN_CRC15_POLY = 0x4599; // x^15+x^14+x^10+x^8+x^7+x^4+x^3+1

export function computeCRC15(bitStream: number[]): number {
  let crc = 0;
  for (const bit of bitStream) {
    const xorBit = ((crc >> 14) ^ bit) & 1;
    crc = ((crc << 1) & 0x7FFF) ^ (xorBit ? CAN_CRC15_POLY : 0);
  }
  return crc;
}
```

### 13.4 Arbitration Simulation (TypeScript)

```typescript
interface CANFrame {
  id: number;         // 11 or 29 bit integer
  isExtended: boolean;
  isRemote: boolean;
  data: Uint8Array;
}

function resolveArbitration(pending: CANFrame[]): { winner: CANFrame; losers: CANFrame[] } {
  let winner = pending[0];
  const losers: CANFrame[] = [];

  for (const frame of pending.slice(1)) {
    // Extended frames lose to standard frames with same effective priority prefix
    const aId = winner.isRemote ? (winner.id << 1) | 1 : winner.id << 1;
    const bId = frame.isRemote ? (frame.id << 1) | 1 : frame.id << 1;

    if (bId < aId) {
      losers.push(winner);
      winner = frame;
    } else {
      losers.push(frame);
    }
  }

  return { winner, losers };
}
```

---

## 15. Performance Optimization & Best Practices

### 15.1 Network Design

| Practice | Rationale |
|---|---|
| Assign IDs by priority (safety-critical = low IDs) | Ensures crash/brake data always wins arbitration |
| Keep safety-critical and infotainment on **separate buses** | Prevent chatty entertainment bus from delaying brakes |
| Limit to **~110 nodes** per classical CAN segment | More nodes → longer arbitration → higher latency |
| Use **CAN FD** when payload > 8 bytes or data rate > 500 kbit/s | Avoid ISO-TP fragmentation overhead |
| Keep stub lengths **< 30 cm** | Reflections degrade signal at >500 kbit/s |

### 15.2 Bus Load Management

- **Theoretical max bus load: 100%** — but real systems target **< 30–50%** to accommodate retransmissions and burst traffic.
- **Bus load formula:**
$$\text{Bus Load (\%)} = \frac{\sum (\text{frame bits} \times \text{frame rate})}{f_{\text{bit rate}}} \times 100$$
- A Classical CAN data frame with 8 bytes = approximately **111 bits** (including worst-case stuffing and overhead).

### 15.3 Bit Timing Best Practices

- Sample point: **75–80%** for high speed (1 Mbit/s); **87.5%** is fine for ≤ 500 kbit/s.
- SJW: Balance between clock drift tolerance and noise immunity; typically **1–4 TQ**.
- Use **online calculators** (e.g., [bittiming.can-wiki.info](http://bittiming.can-wiki.info/)) to validate your configuration.
- For CAN FD: the data phase sample point should be **70–80%** due to shorter absolute bit time.

### 15.4 Error Handling Guidelines

- Monitor TEC/REC counters in your ECU firmware; alert if a node is approaching passive state.
- Implement **bus-off recovery** logic with a configurable delay (default: 1 second in many stacks).
- Use **error passive mode** as an early warning — investigate root cause before bus-off occurs.
- Log error frame sources to identify physically damaged wiring or failing nodes.

### 15.5 Simulator-Specific Best Practices

- **Deterministic time model:** Use a virtual clock with configurable speed (1×, 10×, 100× real-time).
- **Reproducible scenarios:** Seed random generators; allow scenario save/load as JSON.
- **Separate rendering from protocol engine:** Protocol engine runs at a fixed tick rate; UI renders events asynchronously.
- **Use Web Workers in the browser** to keep the protocol engine off the main thread for smooth 60 fps UI.
- **Throttle high-frequency events** (e.g., 1 Mbit/s = up to 1 million events/sec) to a display-safe rate.

---

## 16. Curated References & Further Reading

### 16.1 Official Standards

| Standard | Access |
|---|---|
| ISO 11898-1:2024 | [iso.org](https://www.iso.org/standard/84803.html) |
| ISO 11898-2:2024 | [iso.org](https://www.iso.org/standard/85819.html) |
| ISO 14229-1 (UDS) | [iso.org](https://www.iso.org/standard/72439.html) |
| ISO 15765-2 (ISO-TP) | [iso.org](https://www.iso.org/standard/66574.html) |
| SAE J1939 | [sae.org](https://www.sae.org/standards/content/j1939_202109/) |
| CiA 301 (CANopen) | [can-cia.org](https://www.can-cia.org/groups/specifications/) |

### 16.2 Learning Resources

| Resource | Type | URL |
|---|---|---|
| CSS Electronics CAN Bus Guide | Tutorial (comprehensive) | [csselectronics.com](https://www.csselectronics.com/pages/can-bus-simple-intro-tutorial) |
| Kvaser CAN Bus Course | Free online course | [kvaser.com/can-protocol/](https://www.kvaser.com/can-protocol/) |
| Wikipedia CAN bus | Reference | [en.wikipedia.org/wiki/CAN_bus](https://en.wikipedia.org/wiki/CAN_bus) |
| HMS Networks CAN Intro | Article series | [hms-networks.com](https://www.hms-networks.com/news-and-insights/news-from-hms/2019/07/10/can-bus-intro) |
| Embit CAN XL Overview | Technical article | [hms-networks.com/can-xl](https://www.hms-networks.com) |
| SocialLedge CAN Tutorial | Deep-dive blog | [socialledge.com](https://www.socialledge.com) |
| CSS Electronics UDS Explained | Tutorial | [csselectronics.com](https://www.csselectronics.com/pages/uds-protocol-tutorial) |
| python-can Docs | Library reference | [python-can.readthedocs.io](https://python-can.readthedocs.io/) |
| cantools Docs | Library reference | [cantools.readthedocs.io](https://cantools.readthedocs.io/) |
| CAN-CiA Publications | Standards body | [can-cia.org/publications](https://www.can-cia.org/publications/) |

### 16.3 Recommended Books

| Title | Author | Focus |
|---|---|---|
| *A Comprehensible Guide to Controller Area Network* | Wilfried Voss | Classic CAN deep-dive |
| *Controller Area Network Projects* | Dr. Dogan Ibrahim | Hands-on microcontroller projects |
| *Embedded Networking with CAN and CANopen* | Olaf Pfeiffer et al. | CANopen applications |
| *Automotive Ethernet* | Kirsten Matheus & Thomas Königseder | Modern E/E including CAN XL context |

### 16.4 Interactive Calculators & Online Tools

| Tool | URL |
|---|---|
| CAN Bit Timing Calculator | [bittiming.can-wiki.info](http://bittiming.can-wiki.info/) |
| NI CAN Bus Analyzer | [ni.com](https://www.ni.com/en/support/documentation/supplemental/21/can-bus.html) |
| CSS Electronics DBC Editor | [csselectronics.com](https://www.csselectronics.com) |
| Kvaser Database Editor | [kvaser.com](https://www.kvaser.com) |

---

*Generated for the CAN-Simulator project (React 19.1 + TypeScript 5.9 + Vite 7.1). Sources: ISO 11898:2024, CSS Electronics CAN Bus Intro [2025], Kvaser, HMS Networks.*
