import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { SideMenuProvider, useSideMenu } from '../../context/SideMenuContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SideMenuProvider>{children}</SideMenuProvider>
);

describe('SideMenuContext', () => {
  describe('Initial State', () => {
    it('should initialize with menu not visible', () => {
      const { result } = renderHook(() => useSideMenu(), { wrapper });

      expect(result.current.isVisible).toBe(false);
    });
  });

  describe('setIsVisible', () => {
    it('should set menu visibility', () => {
      const { result } = renderHook(() => useSideMenu(), { wrapper });

      act(() => {
        result.current.setIsVisible(true);
      });

      expect(result.current.isVisible).toBe(true);

      act(() => {
        result.current.setIsVisible(false);
      });

      expect(result.current.isVisible).toBe(false);
    });
  });
});

