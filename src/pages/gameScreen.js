import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert, ImageBackground, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LottieView from 'lottie-react-native';
import shuffledFiveLetterWords from '../words/shuffled_five_letter_words_array';
import firestore from '@react-native-firebase/firestore';
import { InterstitialAd, TestIds, AdEventType } from 'react-native-google-mobile-ads';
import { RewardedAd, RewardedAdEventType } from 'react-native-google-mobile-ads';
import { useFocusEffect } from '@react-navigation/native';

// Türkçe karakterlerin küçük/büyük harfe dönüşümü için yardımcı fonksiyonlar
const toLowerTurkish = (str) => {
    return str.replace(/İ/g, 'i')
        .replace(/I/g, 'ı')
        .replace(/Ş/g, 'ş')
        .replace(/Ğ/g, 'ğ')
        .replace(/Ü/g, 'ü')
        .replace(/Ç/g, 'ç')
        .replace(/Ö/g, 'ö')
        .toLowerCase();
};

const toUpperTurkish = (str) => {
    return str.replace(/i/g, 'İ')
        .replace(/ı/g, 'I')
        .replace(/ş/g, 'Ş')
        .replace(/ğ/g, 'Ğ')
        .replace(/ü/g, 'Ü')
        .replace(/ç/g, 'Ç')
        .replace(/ö/g, 'Ö')
        .toUpperCase();
};
const backgroundImages = [
    require('../assets/bg.gif'),
    require('../assets/bg2.png'),
    require('../assets/bg3.png'),
    require('../assets/bg4.jpg'),
    require('../assets/bg5.jpg'),
    require('../assets/bg6.jpg'),
    require('../assets/bg7.jpg'),
    require('../assets/bg8.jpeg'),
    require('../assets/bg10.png'),
];
const androidUnitId = 'ca-app-pub-9926931663630273/6192241004';
const iosUnitId = 'ca-app-pub-9926931663630273/5423118652'
const adUnitId = __DEV__ ? TestIds.INTERSTITIAL : (Platform.OS=='ios' ? iosUnitId : androidUnitId);

const interstitial = InterstitialAd.createForAdRequest(adUnitId, {
    keywords: ['fashion', 'clothing'],
});

const iosRewId = 'ca-app-pub-9926931663630273/8626832652'
const androidRewId = 'ca-app-pub-9926931663630273/4416124908'
const rewUnitId = __DEV__ ? TestIds.REWARDED : (Platform.OS=='ios' ? iosRewId : androidRewId);

const rewarded = RewardedAd.createForAdRequest(rewUnitId, {
  keywords: ['fashion', 'clothing'],
});


const GameScreen = ({ navigation }) => {
    const [wordIndex, setWordIndex] = useState(0);
    const [word, setWord] = useState('');
    const [guess, setGuess] = useState('');
    const [feedback, setFeedback] = useState(Array.from({ length: 5 }, () => Array(5).fill({ letter: '', color: 'gray' })));
    const [attempts, setAttempts] = useState(0);
    const [level, setLevel] = useState(0);
    const [showConfetti, setShowConfetti] = useState(false);
    const [animationComplete, setAnimationComplete] = useState(false);
    const [usedLetters, setUsedLetters] = useState({}); // Kullanılan harfleri takip eder.
    const backgroundColor = useSharedValue('gray');
    const animationTriggers = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => useSharedValue(0)));
    const [rew,setRew] = useState(false)
    const containerY = useSharedValue(-600);
    const keyboardY = useSharedValue(-500);
    const buttonsY = useSharedValue(-400);
    const [backgroundIndex, setBackgroundIndex] = useState(0); // Arkaplan resmi için index
    const [loaded, setLoaded] = useState(false);
    const [rewardLoaded,setRewardLoaded] = useState(false)
    const addHintLetter = () => {
        console.log("addHintLetter çağrıldı - word:", word, "guess:", guess);
    
        // State'lerin boş olup olmadığını kontrol et
        if (!word) {
            console.log("Kelime boş veya hazır değil. word:", word, "guess:", guess);
            return;
        }
    
        const lowerGuess = toLowerTurkish(guess);  // Mevcut tahmin (küçük harflerle)
        const lowerWord = toLowerTurkish(word);  // Gizli kelime (küçük harflerle)
    
        console.log("Gizli kelime (lowerWord):", lowerWord, "Tahmin (lowerGuess):", lowerGuess);
    
        // Kullanıcının bulunduğu satırdaki ilk boş kutuyu bul ve gizli kelimenin o harfini ekle
        for (let i = 0; i < feedback[attempts].length; i++) {
            // Eğer o hücre boşsa (henüz harf eklenmemişse)
            console.log("aslında burası")
            if (feedback[attempts][i].letter === '') {
                const correctLetter = word[i];  // Gizli kelimedeki doğru harfi al
                console.log("Doğru harf:", correctLetter);
    
                // Harfi tahmine ekle ve feedback'i güncelle
                setGuess((prevGuess) => prevGuess + correctLetter);  // Tahmini güncelle
                setFeedback((prevFeedback) => {
                    const newFeedback = [...prevFeedback];
                    newFeedback[attempts][i] = { letter: correctLetter, color: 'gray' };  // Harfi feedback'e ekle
                    return newFeedback;
                });
                break;  // İlk boş kutuya eklediğimiz için döngüyü kır
            }
        }
    };
    
    
    // Ödül kazanıldığında state'leri kontrol ederek harfi ekleyelim
    useEffect(() => {
      
            addHintLetter(); 
        
    }, [rew]); // rewardLoaded, word ve guess değiştiğinde çalışır
    
    useEffect(() => {
        const unsubscribe = interstitial.addAdEventListener(AdEventType.LOADED, () => {
            setLoaded(true);
        });

        const unsubscribeClose = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
            interstitial.load()

        });

        // Start loading the interstitial straight away
        interstitial.load();

        // Unsubscribe from events on unmount
        return () => {
            unsubscribe();
            unsubscribeClose();
          };
    }, [showConfetti]);

    // No advert ready to show yet

    const loadRewardAd = () => {
        rewarded.load();
        const unsubscribeLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
            setRewardLoaded(true); // Reklam yüklendiğinde state güncellenir
        });
    
        const unsubscribeEarned = rewarded.addAdEventListener(
            RewardedAdEventType.EARNED_REWARD,
            reward => {
                setRewardLoaded(false); // Ödül kazanıldığında state sıfırlanır
                setRew(rew => !rew)
            },
        );

        
        const unsubsucribeClosed = rewarded.addAdEventListener(
            AdEventType.CLOSED,()=>{
                console.log("kapattı")
                rewarded.load()
            }
        );

        
    
        // İlk başta reklam yüklemesi yapılır
        rewarded.load();
    
        // Unsubscribe from events on unmount
        return () => {
            unsubscribeLoaded();
            unsubscribeEarned();
            unsubsucribeClosed();
        };
    }


    
    
    useEffect(() => {
        loadRewardAd()
    }, []);


 



    // Seviye değiştiğinde arkaplanı güncelle
    useEffect(() => {
        setBackgroundIndex(Math.floor(level / 2) % backgroundImages.length); // Her 2 seviyede bir değişim
    }, [level]);
    const containerAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: containerY.value }],
    }));

    const keyboardAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: keyboardY.value }],
    }));

    const buttonsAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: buttonsY.value }],
    }));

    const backgroundAnimatedStyle = useAnimatedStyle(() => ({
        backgroundColor: backgroundColor.value,
    }));

    // Arkaplan rengini değiştiren fonksiyon
    const animateBackgroundColor = (result) => {
        let newColor = 'gray';
        if (result.every(cell => cell.color === 'green')) {
            newColor = 'rgba(0, 255, 0, 0.5)'; // Yeşil, opacity %50
        } else if (result.some(cell => cell.color === 'yellow')) {
            newColor = 'rgba(173, 216, 230, 0.2)'; // Açık mavi, opacity %50
        } else if (result.every(cell => cell.color === 'red')) {
            newColor = 'rgba(255, 0, 0, 0.5)'; // Kırmızı, opacity %50
        }

        backgroundColor.value = withTiming(newColor, { duration: 500 });
    };

    // Arkaplan rengini sıfırlama
    const resetBackgroundColor = () => {
        backgroundColor.value = withTiming('gray', { duration: 500 });
    };

    // Seviye bilgilerini AsyncStorage'den al ve yükle
    useEffect(() => {
        const loadLevel = async () => {
            const user = await AsyncStorage.getItem('user');
            if (user) {
                const parsedUser = JSON.parse(user);
                if (parsedUser.level) {
                    setLevel(parsedUser.level);
                    setWord(toUpperTurkish(shuffledFiveLetterWords[parsedUser.level]));
                } else {
                    setLevel(0);
                    setWord(toUpperTurkish(shuffledFiveLetterWords[0]));
                }
            }
        };
        loadLevel();

        // Animasyonları sırayla başlat
        containerY.value = withDelay(400, withTiming(0, { duration: 650 }));
        keyboardY.value = withDelay(200, withTiming(0, { duration: 750 }));
        buttonsY.value = withDelay(0, withTiming(0, { duration: 400 }));
    }, [word]);

    // Kullanıcı doğru tahmin yaptıktan sonra yeşil animasyonu tetikle
    const animateGreen = (result) => {
        result.forEach((_, index) => {
            // Her bir kare için gecikmeyi artırarak animasyonu tetikleyin
            animationTriggers[attempts][index].value = withDelay(index * 500, withTiming(1, { duration: 500 }));
        });
    };


    const handleGuess = (letter) => {
        if (guess.length < 5) {
            setGuess(guess + letter);
            setFeedback((prevFeedback) => {
                const newFeedback = [...prevFeedback];
                newFeedback[attempts] = [...newFeedback[attempts]];
                newFeedback[attempts][guess.length] = { letter, color: 'gray' };
                return newFeedback;
            });
        }
    };

    const handleBackspace = () => {
        if (guess.length > 0) {
            setFeedback((prevFeedback) => {
                const newFeedback = [...prevFeedback];
                newFeedback[attempts] = [...newFeedback[attempts]];
                newFeedback[attempts][guess.length - 1] = { letter: '', color: 'gray' };
                return newFeedback;
            });
            setGuess(guess.slice(0, -1));
        }
    };

    const updateLevel = async () => {
        try {
            const user = await AsyncStorage.getItem('user');
            if (user) {
                const parsedUser = JSON.parse(user);
                const newLevel = parsedUser.level + 1;
                parsedUser.level = newLevel;

                await AsyncStorage.setItem('user', JSON.stringify(parsedUser));
                await firestore().collection('users').doc(parsedUser.id).update({
                    level: newLevel,
                });

                setLevel(newLevel);
                setWord(toUpperTurkish(shuffledFiveLetterWords[newLevel]));
                setUsedLetters({}); // Klavyeyi sıfırla, tekrar yeşil yap

                // Animasyon tetikleyicilerini sıfırla (initial state)
                animationTriggers.forEach((row, rowIndex) => {
                    row.forEach((trigger, colIndex) => {
                        trigger.value = 0; // Her bir animasyon değerini sıfırla
                    });
                });
            }
        } catch (error) {
            console.error('Error updating level:', error);
        }
    };


    // Klavyedeki kullanılmayan harfleri gri yapma fonksiyonu
    const markUsedLetters = (result) => {
        const newUsedLetters = { ...usedLetters };
        result.forEach(cell => {
            if (cell.color === '#d94223') {
                newUsedLetters[cell.letter.toLowerCase()] = 'gray'; // Kırmızı harfleri gri yap
            }
        });
        setUsedLetters(newUsedLetters);
    };

    const checkGuess = () => {

        if (guess.length !== 5) {
            Alert.alert('Lütfen 5 harfli bir tahmin yapın');
            return;
        }

        const lowerGuess = toLowerTurkish(guess);
        const lowerWord = toLowerTurkish(word);

        if (!shuffledFiveLetterWords.includes(lowerGuess)) {
            Alert.alert('Geçersiz Kelime', 'Böyle bir kelime yok!');
            return;
        }

        const result = [];
        for (let i = 0; i < 5; i++) {
            if (lowerGuess[i] === lowerWord[i]) {
                result.push({ letter: guess[i], color: '#66ff66' });
            } else if (lowerWord.includes(lowerGuess[i])) {
                result.push({ letter: guess[i], color: '#63c7e1' });
            } else {
                result.push({ letter: guess[i], color: '#d94223' });
            }
        }

        setFeedback((prevFeedback) => {
            const newFeedback = [...prevFeedback];
            newFeedback[attempts] = result;
            return newFeedback;
        });

        // Klavyedeki kırmızı harfleri gri yap
        markUsedLetters(result);

        // Yeşil animasyonu ve arkaplan rengi animasyonu tetikle
        animateGreen(result);
        animateBackgroundColor(result);

        setGuess('');
        setAttempts(attempts + 1);

        // Eğer tahmin doğruysa tüm kareler yeşil olduğunda konfeti göster
        if (lowerGuess === lowerWord) {
            // Her bir animasyonun tamamlanma süresini hesapla (500ms animasyon + 500ms gecikme * 5 hücre)
            const totalAnimationTime = result.length * 500 + 500;
            setTimeout(() => {
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 3000); // 3 saniye sonra konfeti kapat
                setAnimationComplete(true);

                setTimeout(() => interstitial.show(), 5000);
            }, totalAnimationTime);
            // Tüm kareler yeşil olduktan sonra konfeti patlasın

        } else if (attempts + 1 === 5) {
            // Eğer tahmin yanlışsa oyun bitirilecek ve konfeti patlatılmayacak
            Alert.alert('Oyun Bitti!', `Şansını Tekrar Dene`);
            setAttempts(0);
            setFeedback(Array.from({ length: 5 }, () => Array(5).fill({ letter: '', color: 'gray' })));
            resetBackgroundColor(); // Arkaplan rengini sıfırla
        }
    };



    useEffect(() => {
        if (animationComplete) {
            updateLevel();
            setAttempts(0);
            setFeedback(Array.from({ length: 5 }, () => Array(5).fill({ letter: '', color: 'gray' })));
            setAnimationComplete(false);
            resetBackgroundColor(); // Arkaplan rengini sıfırla
        }
    }, [animationComplete]);

    const AnimatedCell = React.memo(({ letter, color, animationTrigger }) => {
        const animatedStyle = useAnimatedStyle(() => ({
            backgroundColor: animationTrigger.value === 1 ? color : 'gray',
        }));

        return (
            <Animated.View style={[styles.cell, animatedStyle]}>
                <Text style={styles.letter}>{letter}</Text>
            </Animated.View>
        );
    });

    return (
        <ImageBackground
            source={backgroundImages[backgroundIndex]} // GIF dosyasının yolu
            style={styles.backgroundImage}
        >
            <SafeAreaView style={[styles.container, styles.deneme, backgroundAnimatedStyle]}>
                <SafeAreaView style={styles.backButtonContainer}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                        <Text style={styles.backButtonText}>Ana Menü</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.backButton]} onPress={() => {
                        rewarded.show()
                    }}>

                        <Text style={styles.backButtonText}>İpucu</Text>
                        <Ionicons name="videocam-sharp" size={24} color="#fff" />
                    </TouchableOpacity>
                </SafeAreaView>

                <Text style={styles.levelText}>Seviye: {level + 1}</Text>

                {showConfetti && (
                    <>
                        <View style={{ flex: 1, pointerEvents: 'none', position: 'absolute', height: '100%', width: '100%' }}>


                            <LottieView
                                source={require('../lottie/confetti.json')}
                                autoPlay
                                loop={false}

                            // Dokunma olaylarını devre dışı bırakmak için ekledik
                            />
                            <LottieView
                                source={require('../lottie/confetti.json')}
                                autoPlay
                                loop={false}

                            // Dokunma olaylarını devre dışı bırakmak için ekledik
                            />
                        </View>
                    </>
                )}

                <Animated.View style={[styles.grid, containerAnimatedStyle]}>
                    {feedback.map((row, rowIndex) => (
                        <View key={rowIndex} style={styles.row}>
                            {row.map((item, index) => (
                                <AnimatedCell
                                    key={index}
                                    letter={item.letter}
                                    color={item.color}
                                    animationTrigger={animationTriggers[rowIndex][index]}
                                />
                            ))}
                        </View>
                    ))}
                </Animated.View>

                <Animated.View style={[styles.keyboard, keyboardAnimatedStyle]}>
                    <View style={styles.row}>
                        {['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Ğ', 'Ü'].map((letter) => (
                            <TouchableOpacity
                                key={letter}
                                style={[styles.key, { backgroundColor: usedLetters[letter.toLowerCase()] || '#4CAF50' }]}
                                onPress={() => handleGuess(letter)}>
                                <Text style={styles.keyText}>{letter}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.row}>
                        {['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ş', 'İ'].map((letter) => (
                            <TouchableOpacity
                                key={letter}
                                style={[styles.key, { backgroundColor: usedLetters[letter.toLowerCase()] || '#4CAF50' }]}
                                onPress={() => handleGuess(letter)}>
                                <Text style={styles.keyText}>{letter}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <View style={styles.row}>
                        {['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Ö', 'Ç'].map((letter) => (
                            <TouchableOpacity
                                key={letter}
                                style={[styles.key, { backgroundColor: usedLetters[letter.toLowerCase()] || '#4CAF50' }]}
                                onPress={() => handleGuess(letter)}>
                                <Text style={styles.keyText}>{letter}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Animated.View>

                <Animated.View style={[styles.buttonsContainer, buttonsAnimatedStyle]}>
                    <TouchableOpacity style={styles.deleteButton} onPress={handleBackspace}>
                        <Ionicons name="arrow-back-outline" size={24} color="#fff" />
                        <Text style={styles.deleteButtonText}>Sil</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.submitButton} onPress={checkGuess}>
                        <Ionicons name="heart" size={24} color="#fff" />
                        <Text style={styles.submitButtonText}>Şansını Dene</Text>
                    </TouchableOpacity>
                </Animated.View>
            </SafeAreaView>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        borderWidth:1,
        width:'100%',
        justifyContent: 'center',
    },
    deneme:{
        zIndex:10,

    },
    deneme2:{
        zIndex:11
    },
    backgroundImage: {
        flex: 1,
        resizeMode: 'cover',
    },
    backButtonContainer: {
        alignItems: 'flex-start',
        flexDirection: 'row',
        width: '100%',
        justifyContent:'space-around'

    },
    backButton: {
        width: '40%',
        padding: 10,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: '#008CBA',
        borderRadius: 5,
        shadowColor: 'yellow', // Gölge rengi
        shadowOffset: { width: 0, height: 4 }, // Gölge ofseti
        shadowOpacity: 0.5, // Gölgenin opaklık seviyesi
        shadowRadius: 4, // Gölge yayılma çapı
        elevation: 5, // Android için gölge
    },
    
    backButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    levelText: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginVertical: 10,
    },
    grid: {
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    row: {
        flexDirection: 'row',
    },
    cell: {
        width: 50,
        height: 50,
        margin: 5,
        justifyContent: 'center',
        alignItems: 'center',
        borderColor: '#ddd',
        borderWidth: 1,
        backgroundColor: 'gray',
    },
    letter: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    keyboard: {
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        width: '100%',
    },
    key: {
        width: 28,
        height: 28,
        margin: 2,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#4CAF50',
        borderRadius: 5,
    },
    keyText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    buttonsContainer: {
        alignItems: 'center',
        marginTop: 20,
    },
    deleteButton: {
        backgroundColor: '#FF0000',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        marginTop: 20,
        justifyContent: 'center',
        width: 100,
        borderRadius: 5,
    },
    deleteButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 5,
    },
    submitButton: {
        backgroundColor: '#008CBA',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        marginTop: 20,
        justifyContent: 'center',
        width: 150,
        borderRadius: 5,
    },
    submitButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 5,
    },
    confettiLeft: {
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: '80%',

    },
    confettiRight: {
        position: 'absolute',
        right: 0,
        top: 0,
        width: '100%',
        height: '130%',
    },
});

export default GameScreen;
