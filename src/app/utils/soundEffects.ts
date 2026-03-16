// Утилита для создания и проигрывания веселых звуковых эффектов

class SoundEffects {
  private audioContext: AudioContext | null = null;

  constructor() {
    // Создаем AudioContext только при первом использовании
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  // Играть звук успеха (монетки)
  playSuccess() {
    if (!this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(523.25, this.audioContext.currentTime); // C5
    oscillator.frequency.exponentialRampToValueAtTime(1046.50, this.audioContext.currentTime + 0.1); // C6
    
    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.3);
  }

  // Играть звук победы (fanfare)
  playVictory() {
    if (!this.audioContext) return;
    
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, C
    const startTime = this.audioContext.currentTime;
    
    notes.forEach((freq, i) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);
      
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      
      const noteStart = startTime + (i * 0.15);
      gainNode.gain.setValueAtTime(0, noteStart);
      gainNode.gain.linearRampToValueAtTime(0.2, noteStart + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, noteStart + 0.2);
      
      oscillator.start(noteStart);
      oscillator.stop(noteStart + 0.2);
    });
  }

  // Играть звук Level Up
  playLevelUp() {
    if (!this.audioContext) return;
    
    const oscillator1 = this.audioContext.createOscillator();
    const oscillator2 = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator1.frequency.setValueAtTime(392, this.audioContext.currentTime); // G4
    oscillator2.frequency.setValueAtTime(523.25, this.audioContext.currentTime); // C5
    
    oscillator1.frequency.exponentialRampToValueAtTime(1046.50, this.audioContext.currentTime + 0.5); // C6
    oscillator2.frequency.exponentialRampToValueAtTime(1318.51, this.audioContext.currentTime + 0.5); // E6
    
    gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
    
    oscillator1.start(this.audioContext.currentTime);
    oscillator2.start(this.audioContext.currentTime);
    oscillator1.stop(this.audioContext.currentTime + 0.5);
    oscillator2.stop(this.audioContext.currentTime + 0.5);
  }

  // Играть звук "wow"
  playWow() {
    if (!this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filterNode = this.audioContext.createBiquadFilter();
    
    oscillator.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(100, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.3);
    oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.6);
    
    filterNode.type = 'lowpass';
    filterNode.frequency.setValueAtTime(800, this.audioContext.currentTime);
    filterNode.frequency.exponentialRampToValueAtTime(2000, this.audioContext.currentTime + 0.3);
    
    gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.6);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.6);
  }

  // Играть звук в зависимости от количества баллов
  playPointsSound(points: number) {
    if (points >= 20) {
      this.playLevelUp();
      this.playWow();
      return;
    }

    if (points >= 10) {
      this.playVictory();
      return;
    }

    this.playSuccess();
  }
}

export const soundEffects = new SoundEffects();
