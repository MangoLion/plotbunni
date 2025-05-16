import os
import re
import json

# Define the set of CSS variables we care about (without the -- prefix)
TARGET_VARIABLES = [
    'background', 'foreground', 'card', 'card-foreground',
    'popover', 'popover-foreground', 'primary', 'primary-foreground',
    'secondary', 'secondary-foreground', 'muted', 'muted-foreground',
    'accent', 'accent-foreground', 'destructive', 'destructive-foreground',
    'border', 'input', 'ring',
    'chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'
]

def parse_css_block(css_block_content):
    """Parses a block of CSS variables and extracts HSL values for target variables."""
    colors = {}
    # Regex to find lines like '--variable: HSL_VALUE;'
    # It captures the variable name (without --) and the HSL value
    variable_regex = re.compile(r'--([a-zA-Z0-9-]+)\s*:\s*([^;]+);')
    for match in variable_regex.finditer(css_block_content):
        var_name = match.group(1)
        hsl_value = match.group(2).strip()
        if var_name in TARGET_VARIABLES:
            colors[var_name] = hsl_value
    return colors

def parse_css_file(file_path):
    """Parses a CSS file to extract light and dark theme color palettes."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    light_theme_colors = {}
    dark_theme_colors = {}

    # Regex to find :root { ... } block
    root_match = re.search(r':root\s*{([^}]+)}', content, re.DOTALL)
    if root_match:
        light_theme_colors = parse_css_block(root_match.group(1))

    # Regex to find .dark { ... } block
    dark_match = re.search(r'\.dark\s*{([^}]+)}', content, re.DOTALL)
    if dark_match:
        dark_theme_colors = parse_css_block(dark_match.group(1))
        
    # Ensure all target variables are present, even if empty, for consistency
    for var in TARGET_VARIABLES:
        if var not in light_theme_colors:
            light_theme_colors[var] = '' # Or a default placeholder like '0 0% 0%'
        if var not in dark_theme_colors:
            dark_theme_colors[var] = ''

    return light_theme_colors, dark_theme_colors

def to_camel_case(name, suffix=""):
    """Converts a snake-case or kebab-case name to camelCase and adds a suffix."""
    name = name.replace('-', '_') # Normalize to snake_case first
    parts = name.split('_')
    camel_case_name = parts[0] + "".join(x.capitalize() for x in parts[1:])
    return f"{camel_case_name}{suffix}"

def generate_js_presets(themes_dir):
    """Generates the JavaScript content for themePresets.js."""
    js_output_parts = ["// src/data/themePresets.js\n"]
    light_preset_names = []
    dark_preset_names = []
    
    css_files = sorted([f for f in os.listdir(themes_dir) if f.endswith('.css')])

    if not css_files:
        print(f"No CSS files found in {themes_dir}")
        return ""

    for css_file in css_files:
        file_path = os.path.join(themes_dir, css_file)
        theme_base_name = css_file.replace('.css', '')
        
        light_colors, dark_colors = parse_css_file(file_path)

        # Light Preset
        light_preset_var_name = to_camel_case(theme_base_name, "LightPreset")
        light_preset_names.append(light_preset_var_name)
        js_output_parts.append(f"export const {light_preset_var_name} = {{")
        js_output_parts.append(f"  id: '{theme_base_name}-light',")
        js_output_parts.append(f"  name: '{theme_base_name.replace('_', ' ').title()} (Light)',")
        js_output_parts.append(f"  colors: {{")
        for var, val in light_colors.items():
            js_output_parts.append(f"    '{var}': '{val}',")
        js_output_parts.append(f"  }}")
        js_output_parts.append(f"}};\n")

        # Dark Preset
        dark_preset_var_name = to_camel_case(theme_base_name, "DarkPreset")
        dark_preset_names.append(dark_preset_var_name)
        js_output_parts.append(f"export const {dark_preset_var_name} = {{")
        js_output_parts.append(f"  id: '{theme_base_name}-dark',")
        js_output_parts.append(f"  name: '{theme_base_name.replace('_', ' ').title()} (Dark)',")
        js_output_parts.append(f"  colors: {{")
        for var, val in dark_colors.items():
            js_output_parts.append(f"    '{var}': '{val}',")
        js_output_parts.append(f"  }}")
        js_output_parts.append(f"}};\n")

    # Define default presets (using the first parsed theme)
    if light_preset_names:
        js_output_parts.append(f"export const defaultLightPreset = {light_preset_names[0]};\n")
    else:
        js_output_parts.append("export const defaultLightPreset = {}; // No light themes found\n")
        
    if dark_preset_names:
        js_output_parts.append(f"export const defaultDarkPreset = {dark_preset_names[0]};\n")
    else:
        js_output_parts.append("export const defaultDarkPreset = {}; // No dark themes found\n")

    # Export arrays of presets
    js_output_parts.append("export const lightThemePresets = [")
    for name in light_preset_names:
        js_output_parts.append(f"  {name},")
    js_output_parts.append("];\n")

    js_output_parts.append("export const darkThemePresets = [")
    for name in dark_preset_names:
        js_output_parts.append(f"  {name},")
    js_output_parts.append("];\n")
    
    return "\n".join(js_output_parts)

if __name__ == "__main__":
    themes_directory = "themes"  # Relative to where the script is run
    js_content = generate_js_presets(themes_directory)
    print(js_content)
