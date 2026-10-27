import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart' hide FirebaseService;
import 'package:firebase_auth/firebase_auth.dart';
import 'core/theme/app_theme.dart';
import 'services/firebase_service.dart';
import 'screens/home_screen.dart';

const _firebaseApiKey = String.fromEnvironment('FIREBASE_API_KEY');
const _firebaseAppId = String.fromEnvironment('FIREBASE_APP_ID');
const _firebaseMessagingSenderId = String.fromEnvironment(
  'FIREBASE_MESSAGING_SENDER_ID',
);
const _firebaseProjectId = String.fromEnvironment('FIREBASE_PROJECT_ID');
const _firebaseStorageBucket = String.fromEnvironment(
  'FIREBASE_STORAGE_BUCKET',
);

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const SriAmmanStoreScannerApp());
}

class SriAmmanStoreScannerApp extends StatefulWidget {
  const SriAmmanStoreScannerApp({super.key});

  @override
  State<SriAmmanStoreScannerApp> createState() =>
      _SriAmmanStoreScannerAppState();
}

class _SriAmmanStoreScannerAppState extends State<SriAmmanStoreScannerApp> {
  bool _isInitializing = true;
  String? _startupError;

  @override
  void initState() {
    super.initState();
    _initializeFirebase();
  }

  Future<void> _initializeFirebase() async {
    if (mounted) {
      setState(() {
        _isInitializing = true;
        _startupError = null;
      });
    }

    try {
      if ([
        _firebaseApiKey,
        _firebaseAppId,
        _firebaseMessagingSenderId,
        _firebaseProjectId,
      ].any((value) => value.isEmpty)) {
        throw StateError(
          'Firebase settings are missing from this APK. Download the latest scanner APK from the billing QR page.',
        );
      }

      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp(
          options: const FirebaseOptions(
            apiKey: _firebaseApiKey,
            appId: _firebaseAppId,
            messagingSenderId: _firebaseMessagingSenderId,
            projectId: _firebaseProjectId,
            storageBucket: _firebaseStorageBucket == ''
                ? null
                : _firebaseStorageBucket,
          ),
        );
      }

      await FirebaseAuth.instance.signInAnonymously();
      try {
        await FirebaseService().restoreSavedSession();
      } catch (error, stackTrace) {
        debugPrint('Could not restore the previous scanner session: $error');
        debugPrintStack(stackTrace: stackTrace);
      }

      if (mounted) {
        setState(() {
          _isInitializing = false;
        });
      }
    } catch (error, stackTrace) {
      debugPrint('Scanner startup failed: $error');
      debugPrintStack(stackTrace: stackTrace);
      if (mounted) {
        setState(() {
          _isInitializing = false;
          _startupError = error.toString().replaceFirst('Bad state: ', '');
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Sri Amman Store Scanner',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: _isInitializing
          ? const _ScannerStartupScreen()
          : _startupError != null
          ? _ScannerStartupErrorScreen(
              error: _startupError!,
              onRetry: _initializeFirebase,
            )
          : const HomeScreen(),
    );
  }
}

class _ScannerStartupScreen extends StatelessWidget {
  const _ScannerStartupScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 20),
            Text('Starting Sri Amman Store Scanner...'),
          ],
        ),
      ),
    );
  }
}

class _ScannerStartupErrorScreen extends StatelessWidget {
  const _ScannerStartupErrorScreen({
    required this.error,
    required this.onRetry,
  });

  final String error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.cloud_off_rounded,
                  color: Colors.red,
                  size: 56,
                ),
                const SizedBox(height: 16),
                const Text(
                  'Scanner could not connect to Firebase',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                Text(error, textAlign: TextAlign.center),
                const SizedBox(height: 12),
                const Text(
                  'Check your internet connection. If Firebase reports that this operation is not allowed, enable Anonymous sign-in in Firebase Console > Authentication > Sign-in method.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                FilledButton.icon(
                  onPressed: onRetry,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Try again'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
