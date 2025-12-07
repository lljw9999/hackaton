let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let sessionId = null;
let audioContext;
let audioQueue = [];
let isFirstCall = true; // Track if this is the first call
let currentStream = null; // Keep stream alive for continuous recording
let silenceDetectionActive = false;
let silenceDetectionLoop = null;

// Initialize session
async function initSession() {
    try {
        const response = await fetch('/api/session/start', {
            method: 'POST',
        });
        const data = await response.json();
        sessionId = data.sessionId;
        console.log('Session started:', sessionId);
    } catch (error) {
        console.error('Error starting session:', error);
    }
}

// Initialize on page load
initSession();

const callButton = document.getElementById('callButton');
const status = document.getElementById('status');
const recordingIndicator = document.getElementById('recordingIndicator');
const transcript = document.getElementById('transcript');

// Update button text references to work with new structure
const buttonText = callButton.querySelector('.button-text') || callButton;

callButton.addEventListener('click', async () => {
    if (isRecording) {
        // User clicked while recording - manually stop and send (fallback for silence detection)
        console.log('👆 Manual stop triggered by user click');
        stopRecordingAndSend();
    } else if (currentStream && !isRecording) {
        // Stream exists but not recording - end the call completely
        stopAllRecording();
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            currentStream = null;
        }
        callButton.classList.remove('recording');
        callButton.querySelector('.button-text').textContent = 'Call ADA';
        status.textContent = 'Call ended';
        recordingIndicator.style.display = 'none';
    } else {
        // Start the call
        if (isFirstCall) {
            callButton.classList.add('disabled');
            callButton.querySelector('.button-text').textContent = 'Connecting...';
            await playGreeting();
            isFirstCall = false;
            // After greeting plays, automatically start continuous recording
            setTimeout(() => {
                startContinuousRecording();
            }, 500);
        } else {
            await startContinuousRecording();
        }
    }
});

// Improved silence detection function - handles background noise
function detectSilence(stream, onSilence, silenceDelay = 5000, maxRecordingTime = 30000) {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    let silenceStart = performance.now();
    let recordingStart = performance.now();
    let hasDetectedSound = false;
    let baselineNoise = 0;
    let samplesForBaseline = [];
    let sampleCount = 0;
    const BASELINE_SAMPLES = 30; // Sample first 30 frames to establish baseline

    const data = new Uint8Array(analyser.frequencyBinCount);

    function loop() {
        if (!silenceDetectionActive) {
            return;
        }

        analyser.getByteFrequencyData(data);
        
        // Calculate audio level
        const sum = data.reduce((a, b) => a + b, 0);
        const average = sum / data.length;
        const max = Math.max(...data);

        // Establish baseline noise level in first few samples
        if (sampleCount < BASELINE_SAMPLES) {
            samplesForBaseline.push(average);
            sampleCount++;
            if (sampleCount === BASELINE_SAMPLES) {
                // Calculate baseline as average of first samples
                baselineNoise = samplesForBaseline.reduce((a, b) => a + b, 0) / BASELINE_SAMPLES;
                console.log("Baseline noise level established:", baselineNoise.toFixed(2));
            }
            requestAnimationFrame(loop);
            return;
        }

        // Use relative threshold: silence is when audio drops significantly below speech level
        // Speech is typically 2-3x above baseline, so silence is when it's close to baseline
        const speechThreshold = baselineNoise * 2.5; // Speech is 2.5x baseline
        const silenceThreshold = baselineNoise * 1.3; // Silence is 1.3x baseline (slightly above baseline for noise)
        
        const isSpeech = average > speechThreshold || max > speechThreshold * 1.5;
        const isSilent = average < silenceThreshold && max < silenceThreshold * 1.2;

        if (isSpeech) {
            hasDetectedSound = true;
            silenceStart = performance.now();
        } else if (hasDetectedSound && isSilent) {
            // Only detect silence if we've heard speech first
            const silenceDuration = performance.now() - silenceStart;
            if (silenceDuration > silenceDelay) {
                console.log("AUTO STOP — relative silence detected after", silenceDuration.toFixed(0), "ms");
                console.log("Audio level:", average.toFixed(2), "Baseline:", baselineNoise.toFixed(2));
                onSilence();
                return;
            }
        } else if (hasDetectedSound) {
            // Reset silence timer if we're not in clear silence
            silenceStart = performance.now();
        }

        // FALLBACK: Maximum recording time (30 seconds) - auto-send even if no silence detected
        const recordingDuration = performance.now() - recordingStart;
        if (recordingDuration > maxRecordingTime) {
            console.log("AUTO STOP — maximum recording time reached (30s), sending anyway");
            onSilence();
            return;
        }

        requestAnimationFrame(loop);
    }
    
    loop();
    return audioContext;
}

// Start continuous recording with silence detection
async function startContinuousRecording() {
    try {
        // Get or reuse stream
        if (!currentStream) {
            try {
                currentStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (permissionError) {
                console.error('❌ Microphone permission denied:', permissionError);
                
                // Handle different permission error types
                let errorMessage = 'Microphone access is required to use ADA.';
                
                if (permissionError.name === 'NotAllowedError' || permissionError.name === 'PermissionDeniedError') {
                    errorMessage = 'Microphone permission was denied. Please allow microphone access in your browser settings and try again.';
                } else if (permissionError.name === 'NotFoundError' || permissionError.name === 'DevicesNotFoundError') {
                    errorMessage = 'No microphone found. Please connect a microphone and try again.';
                } else if (permissionError.name === 'NotReadableError' || permissionError.name === 'TrackStartError') {
                    errorMessage = 'Microphone is being used by another application. Please close other apps and try again.';
                }
                
                status.textContent = errorMessage;
                callButton.classList.remove('disabled');
                callButton.querySelector('.button-text').textContent = 'Call ADA';
                alert(errorMessage);
                return;
            }
        }
        
        // Start new recording session
        audioChunks = [];
        mediaRecorder = new MediaRecorder(currentStream, {
            mimeType: 'audio/webm'
        });

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            if (audioChunks.length > 0) {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                await sendAudioToServer(audioBlob);
            }
        };

        mediaRecorder.start();
        isRecording = true;
        
        // Start improved silence detection - handles background noise
        // 5 seconds of relative silence OR 30 seconds max recording time
        silenceDetectionActive = true;
        audioContext = detectSilence(currentStream, () => {
            console.log("Auto-stopping and sending (silence detected or max time reached)");
            stopRecordingAndSend();
        }, 5000, 30000); // 5s silence OR 30s max recording time
        
        callButton.classList.add('recording');
        callButton.classList.remove('disabled');
        callButton.querySelector('.button-text').textContent = 'Click to Send';
        status.textContent = 'Listening... (click button to send, or auto-sends after 5s pause)';
        recordingIndicator.style.display = 'flex';
        
    } catch (error) {
        console.error('Error accessing microphone:', error);
        status.textContent = 'Error: Could not access microphone';
        callButton.classList.remove('disabled');
        callButton.querySelector('.button-text').textContent = 'Call ADA';
        alert('Please allow microphone access to use this feature.');
    }
}

function stopRecordingAndSend() {
    if (mediaRecorder && isRecording) {
        silenceDetectionActive = false;
        const recordingDuration = ((Date.now() - (mediaRecorder.startTime || Date.now())) / 1000).toFixed(1);
        console.log(`🛑 Recording stopped after ${recordingDuration}s (manual or auto), sending to server...`);
        
        // Stop the media recorder - this will trigger onstop which sends to server
        mediaRecorder.stop();
        isRecording = false;
        
        // Close audio context for silence detection (important for mobile audio playback)
        if (audioContext) {
            try {
                // Close audio context and wait for it to fully close
                const contextToClose = audioContext;
                audioContext = null; // Clear reference immediately
                contextToClose.close().then(() => {
                    console.log('✅ Audio context closed successfully');
                }).catch(err => {
                    console.error('Error closing audio context:', err);
                });
            } catch (err) {
                console.error('Error closing audio context:', err);
                audioContext = null;
            }
        }
        
        // Keep button in recording state but show processing
        callButton.classList.add('disabled');
        callButton.querySelector('.button-text').textContent = 'Processing...';
        status.textContent = 'Processing your message...';
    }
}

function stopAllRecording() {
    silenceDetectionActive = false;
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
    }
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
}

// Play greeting when first call is made
async function playGreeting() {
    try {
        status.textContent = 'ADA is greeting you...';
        const response = await fetch(`/api/greeting?sessionId=${sessionId}`, {
            method: 'GET',
        });

        if (response.ok) {
            const audioBlobResponse = await response.blob();
            await playAudioResponse(audioBlobResponse);
        }
    } catch (error) {
        console.error('Error playing greeting:', error);
    }
}

async function sendAudioToServer(audioBlob) {
    try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        formData.append('sessionId', sessionId);

        status.textContent = 'Sending to ADA...';

        const response = await fetch('/api/chat', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Server error');
        }

        // Get audio response
        status.textContent = 'ADA is responding...';
        console.log('📥 Received response, content-type:', response.headers.get('content-type'));
        console.log('📥 Response status:', response.status, response.statusText);
        
        const audioBlobResponse = await response.blob();
        console.log('📦 Audio blob size:', audioBlobResponse.size, 'bytes');
        console.log('📦 Audio blob type:', audioBlobResponse.type);
        
        if (audioBlobResponse.size === 0) {
            throw new Error('Received empty audio response from server');
        }
        
        // Small delay to ensure audio context is fully closed and mic is ready (mobile compatibility)
        await new Promise(resolve => setTimeout(resolve, 150));
        
        try {
            await playAudioResponse(audioBlobResponse);
            console.log('✅ Successfully played ADA response');
        } catch (error) {
            console.error('❌ Failed to play audio:', error);
            status.textContent = 'Error: Could not play audio. Please check your phone volume and try again.';
            // Still try to resume recording even if playback failed
            if (currentStream && !isRecording) {
                setTimeout(() => {
                    if (!isRecording && currentStream) {
                        startContinuousRecording();
                    }
                }, 1000);
            }
            throw error; // Re-throw to be caught by outer catch
        }

        // Auto-resume recording immediately after ADA finishes speaking
        console.log("ADA finished speaking - auto-resuming recording");
        // Resume immediately - no delay needed, fully continuous
        if (currentStream) {
            // Small delay to ensure audio playback finished
            setTimeout(() => {
                if (!isRecording && currentStream) {
                    startContinuousRecording();
                }
            }, 200);
        }

    } catch (error) {
        console.error('Error sending audio:', error);
        status.textContent = 'Error: Could not connect to server. Retrying...';
        
        // Try to resume recording automatically even on error
        if (currentStream && !isRecording) {
            setTimeout(() => {
                console.log("Retrying - resuming recording after error");
                startContinuousRecording();
            }, 1000);
        } else {
            // If stream is dead, show error but keep button available
            callButton.classList.remove('disabled');
            callButton.querySelector('.button-text').textContent = 'Call ADA';
            recordingIndicator.style.display = 'none';
            alert('Error: ' + error.message + '\nClick "Call ADA" to restart.');
        }
    }
}

async function playAudioResponse(audioBlob) {
    return new Promise((resolve, reject) => {
        console.log('🔊 Starting audio playback, blob size:', audioBlob.size);
        
        // CRITICAL: Temporarily pause microphone tracks during playback (mobile compatibility)
        const tracksWereEnabled = [];
        if (currentStream) {
            currentStream.getTracks().forEach(track => {
                tracksWereEnabled.push(track.enabled);
                track.enabled = false; // Pause mic during playback
                console.log('🔇 Microphone track disabled for playback');
            });
        }
        
        // Create audio element
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        // Set audio properties for mobile compatibility
        audio.preload = 'auto';
        audio.volume = 1.0;
        
        let playbackStarted = false;
        let playbackResolved = false;
        
        // Function to attempt playback
        const attemptPlay = () => {
            if (playbackStarted) return;
            playbackStarted = true;
            
            const playPromise = audio.play();
            
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log('✅ Audio playback started successfully');
                    })
                    .catch(error => {
                        console.error('❌ Error playing audio:', error);
                        console.error('Audio error details:', {
                            name: error.name,
                            message: error.message,
                            code: audio.error?.code,
                            errorMessage: audio.error?.message
                        });
                        // Re-enable microphone tracks on error
                        if (currentStream) {
                            currentStream.getTracks().forEach((track, index) => {
                                track.enabled = tracksWereEnabled[index] !== false;
                            });
                        }
                        URL.revokeObjectURL(audioUrl);
                        if (!playbackResolved) {
                            playbackResolved = true;
                            reject(error);
                        }
                    });
            }
        };
        
        // Try to play when audio is ready
        audio.addEventListener('canplaythrough', attemptPlay, { once: true });
        audio.addEventListener('canplay', attemptPlay, { once: true });
        audio.addEventListener('loadeddata', () => {
            console.log('✅ Audio data loaded');
            // Try play immediately if data is loaded
            if (audio.readyState >= 2) {
                attemptPlay();
            }
        }, { once: true });
        
        // Fallback: try after a short delay
        setTimeout(() => {
            if (!playbackStarted && audio.readyState >= 2) {
                console.log('⏰ Fallback: Attempting play after delay');
                attemptPlay();
            }
        }, 200);
        
        audio.onended = () => {
            console.log('✅ Audio playback completed');
            // Re-enable microphone tracks after playback
            if (currentStream) {
                currentStream.getTracks().forEach((track, index) => {
                    track.enabled = tracksWereEnabled[index] !== false;
                });
                console.log('🎤 Microphone tracks re-enabled');
            }
            URL.revokeObjectURL(audioUrl);
            if (!playbackResolved) {
                playbackResolved = true;
                resolve();
            }
        };
        
        audio.onerror = (error) => {
            console.error('❌ Audio element error:', error);
            console.error('Audio error code:', audio.error?.code);
            console.error('Audio error message:', audio.error?.message);
            // Re-enable microphone tracks on error
            if (currentStream) {
                currentStream.getTracks().forEach((track, index) => {
                    track.enabled = tracksWereEnabled[index] !== false;
                });
            }
            URL.revokeObjectURL(audioUrl);
            if (!playbackResolved) {
                playbackResolved = true;
                reject(error);
            }
        };
        
        // Log audio state changes for debugging
        audio.onloadstart = () => console.log('🔄 Audio loading started');
    });
}

// Show transcript (optional - can be enhanced to show actual transcript)
function addToTranscript(userText, adaText) {
    transcript.classList.add('active');
    
    if (userText) {
        const userItem = document.createElement('div');
        userItem.className = 'transcript-item user';
        userItem.innerHTML = `<strong>You:</strong> ${userText}`;
        transcript.appendChild(userItem);
    }
    
    if (adaText) {
        const adaItem = document.createElement('div');
        adaItem.className = 'transcript-item ada';
        adaItem.innerHTML = `<strong>ADA:</strong> ${adaText}`;
        transcript.appendChild(adaItem);
    }
    
    transcript.scrollTop = transcript.scrollHeight;
}

