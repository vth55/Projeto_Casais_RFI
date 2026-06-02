import { describe, expect, it } from 'vitest';
import { getObraCoords } from '../../utils/gpsUtils';

describe('getObraCoords', () => {
  it('returns [lat, lng] for canonical gps.latitude/longitude', () => {
    expect(getObraCoords({ gps: { latitude: 41.1579, longitude: -8.6291 } })).toEqual([41.1579, -8.6291]);
  });

  it('returns [lat, lng] for transitional gps.lat/lng', () => {
    expect(getObraCoords({ gps: { lat: 41.2, lng: -8.7 } })).toEqual([41.2, -8.7]);
  });

  it('returns [lat, lng] for legacy root lat/lng', () => {
    expect(getObraCoords({ lat: 41.3, lng: -8.8 })).toEqual([41.3, -8.8]);
  });

  it('canonical takes priority over transitional', () => {
    expect(getObraCoords({ gps: { latitude: 1, longitude: 2, lat: 3, lng: 4 } })).toEqual([1, 2]);
  });

  it('transitional takes priority over legacy root', () => {
    expect(getObraCoords({ gps: { lat: 1, lng: 2 }, lat: 3, lng: 4 })).toEqual([1, 2]);
  });

  it('returns null for obra with no coords', () => {
    expect(getObraCoords({})).toBeNull();
  });

  it('returns null for null input', () => {
    expect(getObraCoords(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(getObraCoords(undefined)).toBeNull();
  });

  it('returns null when only latitude is present', () => {
    expect(getObraCoords({ gps: { latitude: 41.1 } })).toBeNull();
  });

  it('returns null when only longitude is present', () => {
    expect(getObraCoords({ gps: { longitude: -8.6 } })).toBeNull();
  });

  it('returns null when latitude is a string', () => {
    expect(getObraCoords({ gps: { latitude: '41.1', longitude: -8.6 } })).toBeNull();
  });

  it('returns null when latitude is null', () => {
    expect(getObraCoords({ gps: { latitude: null, longitude: -8.6 } })).toBeNull();
  });

  it('accepts zero as valid coordinate', () => {
    expect(getObraCoords({ gps: { latitude: 0, longitude: 0 } })).toEqual([0, 0]);
  });

  it('accepts negative coordinates', () => {
    expect(getObraCoords({ gps: { latitude: -23.5, longitude: -46.6 } })).toEqual([-23.5, -46.6]);
  });

  it('returns null when latitude is outside the valid range', () => {
    expect(getObraCoords({ gps: { latitude: 91, longitude: -8.6 } })).toBeNull();
  });

  it('returns null when longitude is outside the valid range', () => {
    expect(getObraCoords({ gps: { latitude: 41.1, longitude: 181 } })).toBeNull();
  });

  it('returns null for non-finite coordinates', () => {
    expect(getObraCoords({ gps: { latitude: Number.NaN, longitude: -8.6 } })).toBeNull();
  });
});
