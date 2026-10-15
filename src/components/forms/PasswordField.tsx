import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { TextField, TextFieldProps } from '../../ui/TextField';
import { Icon } from '../../ui/Icon';

export function PasswordField(props: TextFieldProps) {
  const [show, setShow] = useState(false);
  return (
    <TextField
      {...props}
      secureTextEntry={!show}
      autoCapitalize="none"
      autoCorrect={false}
      textContentType="password"
      icon="lock"
      trailing={
        <Pressable onPress={() => setShow((s) => !s)} accessibilityRole="button" accessibilityLabel={show ? 'Hide password' : 'Show password'} hitSlop={12}>
          <Icon name={show ? 'eyeOff' : 'eye'} size="sm" color="icon" />
        </Pressable>
      }
    />
  );
}
