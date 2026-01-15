#!/bin/sh
# PiForge GPIO Helper Script

echo "PiForge GPIO System Initialized"
echo "Available GPIO commands:"
echo "  gpio-mode <pin> <in|out|pwm>  - Set GPIO pin mode"
echo "  gpio-write <pin> <0|1>        - Write to GPIO pin"
echo "  gpio-read <pin>                - Read from GPIO pin"  
echo "  gpio-pwm <pin> <0-100>         - Set PWM duty cycle"
echo "  gpio-status                    - Show all GPIO pins"
echo ""

# Create GPIO command aliases
alias gpio-help='echo "GPIO Commands: gpio-mode, gpio-write, gpio-read, gpio-pwm, gpio-status"'

# Note: These will be intercepted by the terminal emulator
# and forwarded to the JavaScript GPIO simulator
