// ================================================================
// Webcom AI - Speech to Text Input Module
// Author: startgo (startgo@yia.app) | License: GPLv3
// ================================================================

(function () {
    let speechRecognizer = null;
    let isRecordingSpeech = false;

    function toggleSpeechInput() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            const msg = (window.currentLang === 'en')
                ? 'Speech recognition is not supported in this browser (Chrome / Edge recommended).'
                : '此瀏覽器不支援語音辨識功能 (建議使用 Google Chrome 或 Microsoft Edge)。';
            alert(msg);
            return;
        }

        const btnMic = document.getElementById('btn-speech-input');
        if (isRecordingSpeech && speechRecognizer) {
            speechRecognizer.stop();
            return;
        }

        try {
            speechRecognizer = new SpeechRecognition();
            speechRecognizer.lang = (window.currentLang === 'en') ? 'en-US' : 'zh-TW';
            speechRecognizer.continuous = false;
            speechRecognizer.interimResults = true;

            speechRecognizer.onstart = () => {
                isRecordingSpeech = true;
                if (btnMic) {
                    btnMic.classList.add('text-rose-400', 'animate-pulse', 'bg-rose-500/20');
                    btnMic.title = (window.currentLang === 'en') ? 'Listening... click to stop' : '正在聆聽語音... 點擊結束';
                }
            };

            speechRecognizer.onresult = (event) => {
                let transcript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    transcript += event.results[i][0].transcript;
                }
                const chatInput = document.getElementById('chat-input');
                if (transcript && chatInput) {
                    chatInput.value = transcript;
                    chatInput.style.height = 'auto';
                    chatInput.style.height = (chatInput.scrollHeight) + 'px';
                }
            };

            speechRecognizer.onerror = (e) => {
                console.warn('[SpeechRecognition Error]', e.error);
                stopSpeechInput();
            };

            speechRecognizer.onend = () => {
                stopSpeechInput();
            };

            speechRecognizer.start();
        } catch (err) {
            console.warn('Speech start error:', err);
            stopSpeechInput();
        }
    }

    function stopSpeechInput() {
        isRecordingSpeech = false;
        const btnMic = document.getElementById('btn-speech-input');
        if (btnMic) {
            btnMic.classList.remove('text-rose-400', 'animate-pulse', 'bg-rose-500/20');
            btnMic.title = (window.currentLang === 'en') ? 'Voice input (Speech to text)' : '語音輸入 (語音轉文字)';
        }
    }

    window.toggleSpeechInput = toggleSpeechInput;
    window.stopSpeechInput = stopSpeechInput;
})();
