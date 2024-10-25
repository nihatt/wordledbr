import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, ActivityIndicator, Modal, TextInput, ImageBackground, Platform } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Sound from 'react-native-sound';
import { BannerAd, BannerAdSize, TestIds, useForeground } from 'react-native-google-mobile-ads';
import { useFocusEffect } from '@react-navigation/native';
const iosBanner = 'ca-app-pub-9926931663630273/5751186051'
const androidBanner = 'ca-app-pub-9926931663630273/8640901832'
const adUnitId = __DEV__ ? TestIds.ADAPTIVE_BANNER : (Platform.OS=='ios' ? iosBanner : androidBanner);
const WelcomeScreen = ({ navigation }) => {
    const bannerRef = useRef(null);

    // (iOS) WKWebView can terminate if app is in a "suspended state", resulting in an empty banner when app returns to foreground.
    // Therefore it's advised to "manually" request a new ad when the app is foregrounded (https://groups.google.com/g/google-admob-ads-sdk/c/rwBpqOUr8m8).
    useForeground(() => {
        Platform.OS === 'ios' && bannerRef.current?.load();
    })

    const [opacityAnim] = useState(new Animated.Value(0));
    const [borderShimmerAnim] = useState(new Animated.Value(0)); // Shimmer animation
    const [loading, setLoading] = useState(true);
    const [userModal, setUserModal] = useState(false);
    const [username, setUsername] = useState('');
    const [level, setLevel] = useState(0);
    const [wordleColors] = useState(['#ff6347', '#4682b4', '#32cd32', '#ffa500', '#9370db', '#ff4500']);
    const [letterAnims, setLetterAnims] = useState([]);


    useFocusEffect(
        useCallback(() => {
            fetchUserData();
        }, [])
    );

    // No advert ready to show yet

    useEffect(() => {
        Sound.setCategory('Playback'); // iOS için ses kategorisini ayarlayın

        const backgroundMusic = new Sound(require('../assets/music.mp3'), (error) => {
            if (error) {
                console.log('Error loading sound:', error);
                return;
            }

            backgroundMusic.setNumberOfLoops(-1); // Sonsuz döngüde çalmasını sağlar
            backgroundMusic.play((success) => {
                if (!success) {
                    console.log('Sound did not play successfully');
                }
            });
        });

        return () => {
            if (backgroundMusic) {
                backgroundMusic.stop(() => {
                    backgroundMusic.release(); // Bellekten temizler
                });
            }
        };
    }, []);
    useEffect(() => {
        const animations = Array(6).fill(0).map(() => new Animated.Value(1)); // Başlangıç değeri 1
        setLetterAnims(animations);

        // Animasyonları sırayla oynatmak için stagger kullanıyoruz
        const staggeredAnimations = animations.map((anim, index) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.timing(anim, {
                        toValue: 1.5, // Büyüme
                        duration: 500,
                        easing: Easing.ease,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim, {
                        toValue: 1, // Küçülme
                        duration: 500,
                        easing: Easing.ease,
                        useNativeDriver: true,
                    }),
                ])
            );
        });

        // Harflerin sırayla animasyon yapması için stagger'ı başlatıyoruz
        Animated.stagger(300, staggeredAnimations).start();

        Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();

        startShimmerEffect(); // Start shimmer effect on mount
    }, []);

    useEffect(() => {
        fetchUserData();
    }, []);

    const startShimmerEffect = () => {
        Animated.loop(
            Animated.timing(borderShimmerAnim, {
                toValue: 1,
                duration: 2000,
                useNativeDriver: true,
                easing: Easing.linear,
            })
        ).start();
    };

    const fetchUserData = async () => {
        setLoading(true);
        const user = await AsyncStorage.getItem('user');
        if (user) {
            const parsedUser = JSON.parse(user);
            setUsername(parsedUser.username);
            setLevel(parsedUser.level);
            setLoading(false);
        } else {
            setLoading(false);
            setUserModal(true);
        }
    };

    const saveUser = async () => {
        if (!username) {
            alert('Lütfen bir kullanıcı adı girin.');
            return;
        }

        try {
            const userDoc = await firestore().collection('users').add({
                username: username,
                level: 0,
            });

            const userObject = { id: userDoc.id, username, level: 0 };
            await AsyncStorage.setItem('user', JSON.stringify(userObject));

            setLevel(0);
            setUserModal(false);
            setLoading(false);
        } catch (error) {
            console.log('Error saving user:', error);
        }
    };

    const shimmerStyle = {
        borderColor: borderShimmerAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['yellow', 'red'],
        }),
    };

    if (loading) {
        return (
            <View style={{ justifyContent: 'center', alignItems: 'center', flex: 1, backgroundColor: 'rgba(0,200,200,0.5)' }}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    return (
        <ImageBackground source={require('../assets/bg.webp')} style={styles.backgroundImage}>
            <View style={styles.container}>
                <Animated.View style={[styles.shimmerContainer, shimmerStyle]}>
                    <View style={styles.wordleContainer}>
                        {['W', 'O', 'R', 'D', 'L', 'E'].map((letter, index) => (
                            <Animated.Text
                                key={index}
                                style={[
                                    styles.wordleLetter,
                                    { transform: [{ scale: letterAnims[index] }], color: wordleColors[index % wordleColors.length] }
                                ]}
                            >
                                {letter}
                            </Animated.Text>
                        ))}
                    </View>

                    {username ? (
                        <View style={{ alignItems: 'center' }}>
                            <Text style={styles.welcomeText}>Hoşgeldin {username}!</Text>
                            <Text style={styles.levelText}>Güncel Level: {level + 1}</Text>
                        </View>
                    ) : null}

                    <Animated.View style={{ opacity: opacityAnim }}>
                        <TouchableOpacity onPress={() => { navigation.navigate('Game') }} style={styles.startButton}>
                            <Text style={styles.startButtonText}>Oyuna Başla</Text>
                            <Ionicons name="game-controller" size={24} color="#fff" />
                        </TouchableOpacity>
                    </Animated.View>
                </Animated.View>

                <Modal visible={userModal} animationType="slide" transparent={true}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Ionicons name="person-circle-outline" size={60} color="#4682b4" />
                            <Text style={styles.modalTitle}>Hoş geldiniz!</Text>
                            <Text style={styles.modalSubtitle}>Lütfen bir kullanıcı adı giriniz:</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Kullanıcı Adı"
                                value={username}
                                onChangeText={setUsername}
                            />
                            <TouchableOpacity style={styles.saveButton} onPress={saveUser}>
                                <Text style={styles.saveButtonText}>Kaydet</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </View>
            <View style={{ justifyContent: 'center', alignItems: 'center', marginBottom: 30 }}>
                <Text>dbR Studios 1.0</Text>
                <View>
                    <BannerAd ref={bannerRef} unitId={adUnitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
                </View>
            </View>

        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
        resizeMode: 'cover',
        justifyContent: 'center',
    },
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    shimmerContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.7)', // Semi-transparent background
        borderRadius: 20,
        padding: 20,
        borderWidth: 2,
        borderColor: 'blue', // Initial border color

    },
    wordleContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    wordleLetter: {
        fontSize: 48,
        fontWeight: 'bold',
        marginHorizontal: 5,
    },
    welcomeText: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    levelText: {
        fontSize: 18,
        color: '#666',
        marginBottom: 20,
    },
    startButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 15,
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 40,
        borderRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
    },
    startButtonText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    modalContent: {
        width: '80%',
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    modalSubtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
    },
    input: {
        width: '100%',
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 5,
        paddingLeft: 10,
        marginBottom: 20,
    },
    saveButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 10,
        paddingHorizontal: 30,
        borderRadius: 5,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default WelcomeScreen;
