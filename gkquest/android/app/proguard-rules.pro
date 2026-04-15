# Add project specific ProGuard rules here.
# For more details, see http://developer.android.com/guide/developing/tools/proguard.html

# ── Capacitor WebView ──
-keep class com.getcapacitor.** { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ── Firebase Auth ──
-keep class com.google.firebase.** { *; }
-keep class io.capawesome.capacitorjs.plugins.firebase.** { *; }

# ── Facebook SDK (optional dependency, not included) ──
-dontwarn com.facebook.**
-keep class com.facebook.** { *; }

# ── Google AdMob ──
-keep class com.google.android.gms.ads.** { *; }
-dontwarn com.google.android.gms.ads.**

# ── General ──
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-keep public class * extends java.lang.Exception

# ── Prevent stripping of Capacitor plugins ──
-keep class * extends com.getcapacitor.Plugin { *; }
