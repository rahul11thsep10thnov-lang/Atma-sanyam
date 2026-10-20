# Add project specific ProGuard rules here.
# Rules for Compose, Room, etc. will be added as those modules grow.
-keepattributes *Annotation*
-keepclassmembers enum * { public static **[] values(); public static ** valueOf(java.lang.String); }
