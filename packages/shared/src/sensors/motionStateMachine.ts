/**
 * Finite State Machine for Namaz Physical Posture Tracking (Qiyam -> Ruku -> Sujood).
 * Designed for Pocket Motion sensors (pitch angle and acceleration magnitude).
 */

export type PostureState = 'IDLE' | 'QIYAM' | 'RUKU' | 'QIYAM_AFTER_RUKU' | 'SUJOOD_1' | 'JALSA' | 'SUJOOD_2' | 'COMPLETED';

export interface SensorReading {
  timestampMs: number;
  pitchDegrees: number; // Vertical tilt angle (-90 to +90 deg or 0 to 180)
  accelerationMagnitude: number; // ~9.8 m/s^2 at rest
}

export class PrayerMotionStateMachine {
  private state: PostureState = 'IDLE';
  private rakatCount: number = 0;
  private stateEnteredTime: number = 0;
  private minPostureHoldMs: number = 2000; // Hold posture for at least 2 seconds to filter random moves

  constructor(private targetRakats: number = 2) {}

  public processReading(reading: SensorReading): PostureState {
    const isQuiet = Math.abs(reading.accelerationMagnitude - 9.8) < 3.5; // relatively stationary
    const now = reading.timestampMs;

    // Pitch definitions (phone upright in pocket: ~70-90° Qiyam, bowed ~20-50° Ruku, prostrated < 15° Sujood)
    const isUpright = reading.pitchDegrees >= 65;
    const isBowing = reading.pitchDegrees >= 25 && reading.pitchDegrees < 60;
    const isProstrated = reading.pitchDegrees < 20;

    switch (this.state) {
      case 'IDLE':
        if (isUpright && isQuiet) {
          this.state = 'QIYAM';
          this.stateEnteredTime = now;
        }
        break;

      case 'QIYAM':
        if (isBowing && (now - this.stateEnteredTime >= this.minPostureHoldMs)) {
          this.state = 'RUKU';
          this.stateEnteredTime = now;
        }
        break;

      case 'RUKU':
        if (isUpright && (now - this.stateEnteredTime >= this.minPostureHoldMs)) {
          this.state = 'QIYAM_AFTER_RUKU';
          this.stateEnteredTime = now;
        }
        break;

      case 'QIYAM_AFTER_RUKU':
        if (isProstrated && (now - this.stateEnteredTime >= 1000)) {
          this.state = 'SUJOOD_1';
          this.stateEnteredTime = now;
        }
        break;

      case 'SUJOOD_1':
        if (!isProstrated && (now - this.stateEnteredTime >= this.minPostureHoldMs)) {
          this.state = 'JALSA';
          this.stateEnteredTime = now;
        }
        break;

      case 'JALSA':
        if (isProstrated && (now - this.stateEnteredTime >= 1000)) {
          this.state = 'SUJOOD_2';
          this.stateEnteredTime = now;
        }
        break;

      case 'SUJOOD_2':
        if (now - this.stateEnteredTime >= this.minPostureHoldMs) {
          this.rakatCount++;
          if (this.rakatCount >= this.targetRakats) {
            this.state = 'COMPLETED';
          } else {
            this.state = 'QIYAM';
            this.stateEnteredTime = now;
          }
        }
        break;

      case 'COMPLETED':
        // Finished
        break;
    }

    return this.state;
  }

  public getState(): PostureState {
    return this.state;
  }

  public getRakatCount(): number {
    return this.rakatCount;
  }

  public isComplete(): boolean {
    return this.state === 'COMPLETED';
  }

  public reset(): void {
    this.state = 'IDLE';
    this.rakatCount = 0;
    this.stateEnteredTime = 0;
  }
}
