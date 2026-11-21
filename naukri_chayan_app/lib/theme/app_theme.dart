import 'package:google_fonts/google_fonts.dart';
import 'package:material_ui/material_ui.dart';

/// Design tokens copied from the website's `globals.css`.
class Brand {
  static const green = Color(0xFF25D482);
  static const coral = Color(0xFFFF6A5A);
  static const teal600 = Color(0xFF0D9488);
  static const teal700 = Color(0xFF0F766E);
  static const teal50 = Color(0xFFF0FDFA);
  static const amber = Color(0xFFF59E0B);
  static const slate900 = Color(0xFF0F172A);
  static const slate700 = Color(0xFF334155);
  static const slate500 = Color(0xFF64748B);
  static const slate200 = Color(0xFFE2E8F0);
  static const slate50 = Color(0xFFF8FAFC);
  static const brown = Color(0xFF6B3412);
  static const brownDark = Color(0xFF4A220A);
  static const cream = Color(0xFFF6DCC0);
  static const tabFill = Color(0xFFF6B483);
  static const tabBorder = Color(0xFFE0823F);
  static const orange200 = Color(0xFFFED7AA);

  static const headingGradient = LinearGradient(colors: [green, coral]);
}

ThemeData buildTheme() {
  final base = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(seedColor: Brand.teal600, primary: Brand.teal700, secondary: Brand.coral, surface: Colors.white),
    scaffoldBackgroundColor: const Color(0xFFFFF7F0),
  );
  final text = GoogleFonts.nunitoTextTheme(base.textTheme).apply(bodyColor: Brand.slate900, displayColor: Brand.slate900);
  return base.copyWith(
    textTheme: text,
    appBarTheme: AppBarTheme(
      backgroundColor: Colors.white.withValues(alpha: 0.92),
      foregroundColor: Brand.brownDark,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 1,
      titleTextStyle: GoogleFonts.josefinSans(fontSize: 20, fontWeight: FontWeight.w700, color: Brand.brownDark),
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Brand.slate200),
      ),
    ),
    chipTheme: base.chipTheme.copyWith(
      side: const BorderSide(color: Brand.orange200),
      selectedColor: Brand.tabFill,
      labelStyle: GoogleFonts.nunito(fontWeight: FontWeight.w600, color: Brand.brownDark),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Brand.tabBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Brand.tabBorder),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Brand.brown, width: 2),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: Brand.teal700,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        textStyle: GoogleFonts.nunito(fontWeight: FontWeight.w700),
      ),
    ),
  );
}

/// Headings on the site are Josefin Sans painted in the green→coral gradient.
class GradientHeading extends StatelessWidget {
  const GradientHeading(this.text, {super.key, this.size = 22, this.textAlign});
  final String text;
  final double size;
  final TextAlign? textAlign;

  @override
  Widget build(BuildContext context) {
    return ShaderMask(
      blendMode: BlendMode.srcIn,
      shaderCallback: (bounds) => Brand.headingGradient.createShader(Rect.fromLTWH(0, 0, bounds.width, bounds.height)),
      child: Text(
        text,
        textAlign: textAlign,
        style: GoogleFonts.josefinSans(fontSize: size, fontWeight: FontWeight.w700, height: 1.25, color: Colors.white),
      ),
    );
  }
}
