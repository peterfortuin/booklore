import {beforeEach, describe, expect, it, vi} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {AppMenuitemComponent} from './app.menuitem.component';
import {Router} from '@angular/router';
import {MenuService} from './service/app.menu.service';
import {UserService} from '../../../../features/settings/user-management/user.service';
import {DialogLauncherService} from '../../../services/dialog-launcher.service';
import {BookDialogHelperService} from '../../../../features/book/components/book-browser/book-dialog-helper.service';
import {BookPatchService} from '../../../../features/book/service/book-patch.service';
import {MessageService} from 'primeng/api';
import {ShelfService} from '../../../../features/book/service/shelf.service';
import {TranslocoService} from '@jsverse/transloco';
import {of, Subject} from 'rxjs';

function makeDragEvent(types: string[], bookIdsJson?: string): DragEvent {
  const dataMap = new Map<string, string>();
  if (bookIdsJson !== undefined) {
    dataMap.set('bookids', bookIdsJson);
  }
  const dt = {
    types,
    getData: vi.fn((key: string) => dataMap.get(key.toLowerCase()) ?? ''),
    setData: vi.fn(),
  } as unknown as DataTransfer;
  return {dataTransfer: dt, preventDefault: vi.fn()} as unknown as DragEvent;
}

describe('AppMenuitemComponent – drag-and-drop', () => {
  let component: AppMenuitemComponent;
  let mockBookPatchService: {updateBookShelves: ReturnType<typeof vi.fn>};
  let mockShelfService: {reloadShelves: ReturnType<typeof vi.fn>};
  let mockMessageService: {add: ReturnType<typeof vi.fn>};
  let mockTransloco: {translate: ReturnType<typeof vi.fn>};
  let menuSourceSubject: Subject<any>;
  let menuResetSubject: Subject<any>;

  beforeEach(() => {
    menuSourceSubject = new Subject();
    menuResetSubject = new Subject();

    mockBookPatchService = {updateBookShelves: vi.fn(() => of([]))};
    mockShelfService = {reloadShelves: vi.fn()};
    mockMessageService = {add: vi.fn()};
    mockTransloco = {translate: vi.fn((key: string) => key)};

    TestBed.configureTestingModule({
      providers: [
        {
          provide: Router,
          useValue: {
            events: of(),
            url: '/',
            isActive: vi.fn(() => false),
            navigate: vi.fn(),
          }
        },
        {
          provide: MenuService,
          useValue: {
            menuSource$: menuSourceSubject.asObservable(),
            resetSource$: menuResetSubject.asObservable(),
            onMenuStateChange: vi.fn(),
          }
        },
        {provide: UserService, useValue: {userState$: of(null)}},
        {provide: DialogLauncherService, useValue: {}},
        {provide: BookDialogHelperService, useValue: {}},
        {provide: BookPatchService, useValue: mockBookPatchService},
        {provide: MessageService, useValue: mockMessageService},
        {provide: ShelfService, useValue: mockShelfService},
        {provide: TranslocoService, useValue: mockTransloco},
      ]
    });

    const fixture = TestBed.createComponent(AppMenuitemComponent);
    component = fixture.componentInstance;
    component.item = {label: 'My Shelf', shelfId: 10};
    component.index = 0;
    component.root = false;
    component.parentKey = '';
    component.menuKey = 'main';
  });

  // ─── onDragOver ────────────────────────────────────────────────────────────

  describe('onDragOver', () => {
    it('should call preventDefault and set isDragOver when shelfId is set and type is bookids', () => {
      const event = makeDragEvent(['bookids']);
      component.onDragOver(event);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.isDragOver).toBe(true);
    });

    it('should not call preventDefault when shelfId is null', () => {
      component.item = {label: 'Library', shelfId: null};
      const event = makeDragEvent(['bookids']);
      component.onDragOver(event);
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(component.isDragOver).toBe(false);
    });

    it('should not call preventDefault when item has no shelfId', () => {
      component.item = {label: 'Library'};
      const event = makeDragEvent(['bookids']);
      component.onDragOver(event);
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(component.isDragOver).toBe(false);
    });

    it('should not call preventDefault when drag type is not bookids', () => {
      const event = makeDragEvent(['text/plain']);
      component.onDragOver(event);
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(component.isDragOver).toBe(false);
    });
  });

  // ─── onDragLeave ───────────────────────────────────────────────────────────

  describe('onDragLeave', () => {
    it('should set isDragOver to false', () => {
      component.isDragOver = true;
      component.onDragLeave({} as DragEvent);
      expect(component.isDragOver).toBe(false);
    });
  });

  // ─── onDrop ────────────────────────────────────────────────────────────────

  describe('onDrop', () => {
    it('should call preventDefault and clear isDragOver', () => {
      component.isDragOver = true;
      const event = makeDragEvent(['bookids'], JSON.stringify([1]));
      component.onDrop(event);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.isDragOver).toBe(false);
    });

    it('should call updateBookShelves with correct arguments', () => {
      const event = makeDragEvent(['bookids'], JSON.stringify([1, 2, 3]));
      component.onDrop(event);
      expect(mockBookPatchService.updateBookShelves).toHaveBeenCalledWith(
        new Set([1, 2, 3]),
        new Set([10]),
        new Set()
      );
    });

    it('should reload shelves and show success toast on success', () => {
      const event = makeDragEvent(['bookids'], JSON.stringify([5]));
      component.onDrop(event);
      expect(mockShelfService.reloadShelves).toHaveBeenCalled();
      expect(mockMessageService.add).toHaveBeenCalledWith(expect.objectContaining({severity: 'success'}));
    });

    it('should show error toast when updateBookShelves errors', () => {
      mockBookPatchService.updateBookShelves.mockReturnValue(
        new (require('rxjs').Observable)((obs: any) => obs.error(new Error('fail')))
      );
      const event = makeDragEvent(['bookids'], JSON.stringify([5]));
      component.onDrop(event);
      expect(mockMessageService.add).toHaveBeenCalledWith(expect.objectContaining({severity: 'error'}));
    });

    it('should not call updateBookShelves when shelfId is null', () => {
      component.item = {label: 'Library', shelfId: null};
      const event = makeDragEvent(['bookids'], JSON.stringify([5]));
      component.onDrop(event);
      expect(mockBookPatchService.updateBookShelves).not.toHaveBeenCalled();
    });

    it('should not call updateBookShelves when bookIds list is empty', () => {
      const event = makeDragEvent(['bookids'], JSON.stringify([]));
      component.onDrop(event);
      expect(mockBookPatchService.updateBookShelves).not.toHaveBeenCalled();
    });

    it('should not call updateBookShelves when dataTransfer data is missing', () => {
      const event = makeDragEvent(['bookids']);
      component.onDrop(event);
      expect(mockBookPatchService.updateBookShelves).not.toHaveBeenCalled();
    });
  });
});
