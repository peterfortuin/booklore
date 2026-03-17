import {beforeEach, describe, expect, it, vi} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {BookCardComponent} from './book-card.component';
import {BookSelectionService} from '../book-selection.service';
import {BookService} from '../../../service/book.service';
import {BookFileService} from '../../../service/book-file.service';
import {BookMetadataManageService} from '../../../service/book-metadata-manage.service';
import {TaskHelperService} from '../../../../settings/task-management/task-helper.service';
import {UserService} from '../../../../settings/user-management/user.service';
import {EmailService} from '../../../../settings/email-v2/email.service';
import {ConfirmationService, MessageService} from 'primeng/api';
import {Router} from '@angular/router';
import {UrlHelperService} from '../../../../../shared/service/url-helper.service';
import {BookDialogHelperService} from '../book-dialog-helper.service';
import {BookNavigationService} from '../../../service/book-navigation.service';
import {AppSettingsService} from '../../../../../shared/service/app-settings.service';
import {TranslocoService} from '@jsverse/transloco';
import {ReadStatusHelper} from '../../../helpers/read-status.helper';
import {of} from 'rxjs';
import {Book} from '../../../model/book.model';
import {BookDragService} from '../book-drag.service';

function createDragEvent(types: string[], currentTarget?: HTMLElement): DragEvent {
  const dataMap = new Map<string, string>();
  const dt = {
    types,
    setData: vi.fn((key: string, value: string) => dataMap.set(key.toLowerCase(), value)),
    getData: vi.fn((key: string) => dataMap.get(key.toLowerCase()) ?? ''),
    setDragImage: vi.fn(),
    effectAllowed: 'all',
  } as unknown as DataTransfer;
  return {dataTransfer: dt, preventDefault: vi.fn(), currentTarget: currentTarget ?? null} as unknown as DragEvent;
}

function createTouchEvent(clientX: number, clientY: number, type: 'touchstart' | 'touchmove' | 'touchend'): TouchEvent {
  const touch = {clientX, clientY} as Touch;
  return {
    touches: type !== 'touchend' ? [touch] : [],
    changedTouches: [touch],
    preventDefault: vi.fn(),
  } as unknown as TouchEvent;
}

function mockElementFromPoint(element: Element | null): void {
  Object.defineProperty(document, 'elementFromPoint', {
    value: vi.fn(() => element),
    writable: true,
    configurable: true,
  });
}

function makeProviders(mockDragService: any) {
  return [
    BookSelectionService,
    {provide: BookDragService, useValue: mockDragService},
    {provide: BookService, useValue: {bookState$: of({loaded: false, books: []})}},
    {provide: BookFileService, useValue: {}},
    {provide: BookMetadataManageService, useValue: {}},
    {provide: TaskHelperService, useValue: {}},
    {provide: UserService, useValue: {userState$: of(null)}},
    {provide: EmailService, useValue: {}},
    {provide: MessageService, useValue: {add: vi.fn()}},
    {provide: Router, useValue: {navigate: vi.fn(), events: of(), url: '/', isActive: vi.fn(() => false)}},
    {provide: UrlHelperService, useValue: {getThumbnailUrl: vi.fn(() => ''), getAudiobookThumbnailUrl: vi.fn(() => '')}},
    {provide: ConfirmationService, useValue: {}},
    {provide: BookDialogHelperService, useValue: {}},
    {provide: BookNavigationService, useValue: {}},
    {provide: AppSettingsService, useValue: {appSettings$: of(null)}},
    {
      provide: TranslocoService, useValue: {
        translate: vi.fn((key: string) => key),
        selectTranslation: vi.fn(() => of({})),
        langChanges$: of('en'),
      }
    },
    {
      provide: ReadStatusHelper, useValue: {
        getReadStatusIcon: vi.fn(() => ''),
        getReadStatusClass: vi.fn(() => ''),
        getReadStatusTooltip: vi.fn(() => ''),
        shouldShowStatusIcon: vi.fn(() => false),
      }
    },
  ];
}

const mockBook: Partial<Book> = {
  id: 42,
  metadata: {title: 'Test Book'} as any,
  readStatus: 'UNREAD' as any,
};

describe('BookCardComponent – onDragStart', () => {
  let component: BookCardComponent;
  let bookSelectionService: BookSelectionService;
  let mockDragService: {startDrag: ReturnType<typeof vi.fn>; endDrag: ReturnType<typeof vi.fn>; dropOnShelf: ReturnType<typeof vi.fn>; draggedBookIds: number[]};

  beforeEach(() => {
    mockDragService = {
      startDrag: vi.fn(),
      endDrag: vi.fn(),
      dropOnShelf: vi.fn(),
      draggedBookIds: [],
    };

    TestBed.configureTestingModule({providers: makeProviders(mockDragService)});

    const fixture = TestBed.createComponent(BookCardComponent);
    component = fixture.componentInstance;
    bookSelectionService = TestBed.inject(BookSelectionService);

    component.book = mockBook as Book;
    component.isSelected = false;
    component.index = 0;
  });

  it('should not set dataTransfer data when book id is null', () => {
    component.book = {...mockBook, id: undefined} as any;
    const event = createDragEvent([]);
    component.onDragStart(event);
    expect(event.dataTransfer!.setData).not.toHaveBeenCalled();
  });

  it('should set bookIds with only the dragged book id when not selected', () => {
    component.isSelected = false;
    const event = createDragEvent([]);
    component.onDragStart(event);
    expect(event.dataTransfer!.setData).toHaveBeenCalledWith('bookIds', JSON.stringify([42]));
  });

  it('should set bookIds with only the dragged book id when selected but selection has only 1 book', () => {
    bookSelectionService.setSelectedBooks(new Set([42]));
    component.isSelected = true;
    const event = createDragEvent([]);
    component.onDragStart(event);
    expect(event.dataTransfer!.setData).toHaveBeenCalledWith('bookIds', JSON.stringify([42]));
  });

  it('should set bookIds with all selected book ids when selection has multiple books, with dragged book first', () => {
    bookSelectionService.setSelectedBooks(new Set([42, 7, 99]));
    component.isSelected = true;
    const event = createDragEvent([]);
    component.onDragStart(event);

    const call = (event.dataTransfer!.setData as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe('bookIds');
    const ids: number[] = JSON.parse(call[1]);
    expect(ids[0]).toBe(42); // dragged book (book.id=42) must be first
    expect(ids.sort((a, b) => a - b)).toEqual([7, 42, 99]);
  });

  it('should set bookIds with only the dragged book id when isSelected is false even if other books are selected', () => {
    bookSelectionService.setSelectedBooks(new Set([42, 7, 99]));
    component.isSelected = false;
    const event = createDragEvent([]);
    component.onDragStart(event);
    expect(event.dataTransfer!.setData).toHaveBeenCalledWith('bookIds', JSON.stringify([42]));
  });

  it('should also call bookDragService.startDrag on drag start', () => {
    component.isSelected = false;
    const event = createDragEvent([]);
    component.onDragStart(event);
    expect(mockDragService.startDrag).toHaveBeenCalledWith([42]);
  });

  it('should call setDragImage with the .book-cover img for a single-book drag', () => {
    const coverImg = document.createElement('img');
    coverImg.className = 'book-cover';
    const card = document.createElement('div');
    card.appendChild(coverImg);

    component.isSelected = false;
    const event = createDragEvent([], card);
    component.onDragStart(event);

    expect(event.dataTransfer!.setDragImage).toHaveBeenCalledWith(coverImg, expect.any(Number), expect.any(Number));
  });

  it('should call setDragImage with a stacked ghost element for a multi-book drag', () => {
    bookSelectionService.setSelectedBooks(new Set([42, 7, 99]));
    component.isSelected = true;
    const event = createDragEvent([]);
    component.onDragStart(event);

    expect(event.dataTransfer!.setDragImage).toHaveBeenCalledWith(expect.any(HTMLElement), expect.any(Number), expect.any(Number));
    const ghostArg = (event.dataTransfer!.setDragImage as ReturnType<typeof vi.fn>).mock.calls[0][0] as HTMLElement;
    // Ghost should contain stacked cover images (up to 3) + badge
    const imgs = ghostArg.querySelectorAll('img');
    expect(imgs.length).toBe(3);
    expect(ghostArg.querySelector('div')).not.toBeNull();
    // No .book-cover element in the currentTarget, so getThumbnailUrl is used as fallback for all slots
    const urlHelper = TestBed.inject(UrlHelperService);
    expect(urlHelper.getThumbnailUrl).toHaveBeenCalledWith(42);
    // dragged book (id=42 at index 0) is drawn last (on top); last getThumbnailUrl call should be for 42
    const calls = (urlHelper.getThumbnailUrl as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[calls.length - 1][0]).toBe(42);
  });

  it('should clone .book-cover img for the top slot in multi-book ghost when cover is available', () => {
    bookSelectionService.setSelectedBooks(new Set([42, 7, 99]));
    component.isSelected = true;
    const coverImg = document.createElement('img');
    coverImg.className = 'book-cover';
    coverImg.src = 'http://example.com/cover-42.jpg';
    const card = document.createElement('div');
    card.appendChild(coverImg);
    const event = createDragEvent([], card);
    component.onDragStart(event);

    // getThumbnailUrl must NOT be called with 42 (top slot uses cloned img element)
    const urlHelper = TestBed.inject(UrlHelperService);
    expect(urlHelper.getThumbnailUrl).not.toHaveBeenCalledWith(42);
    // But it must still be called for the other books in the stack
    expect(urlHelper.getThumbnailUrl).toHaveBeenCalledWith(7);
    expect(urlHelper.getThumbnailUrl).toHaveBeenCalledWith(99);
  });
});

describe('BookCardComponent – touch drag-and-drop', () => {
  let component: BookCardComponent;
  let bookSelectionService: BookSelectionService;
  let mockDragService: {startDrag: ReturnType<typeof vi.fn>; endDrag: ReturnType<typeof vi.fn>; dropOnShelf: ReturnType<typeof vi.fn>; draggedBookIds: number[]};

  beforeEach(() => {
    mockDragService = {
      startDrag: vi.fn(),
      endDrag: vi.fn(),
      dropOnShelf: vi.fn(),
      draggedBookIds: [],
    };

    TestBed.configureTestingModule({providers: makeProviders(mockDragService)});

    const fixture = TestBed.createComponent(BookCardComponent);
    component = fixture.componentInstance;
    bookSelectionService = TestBed.inject(BookSelectionService);

    component.book = mockBook as Book;
    component.isSelected = false;
    component.index = 0;
  });

  // ─── onTouchStart ─────────────────────────────────────────────────────────

  it('should not call startDrag when book id is null', () => {
    component.book = {...mockBook, id: undefined} as any;
    component.onTouchStart(createTouchEvent(0, 0, 'touchstart'));
    expect(mockDragService.startDrag).not.toHaveBeenCalled();
  });

  it('should call startDrag with the single book id when not selected', () => {
    component.isSelected = false;
    component.onTouchStart(createTouchEvent(0, 0, 'touchstart'));
    expect(mockDragService.startDrag).toHaveBeenCalledWith([42]);
  });

  it('should call startDrag with all selected ids when selection has multiple books', () => {
    bookSelectionService.setSelectedBooks(new Set([42, 7, 99]));
    component.isSelected = true;
    component.onTouchStart(createTouchEvent(0, 0, 'touchstart'));
    const ids: number[] = mockDragService.startDrag.mock.calls[0][0];
    expect(ids.sort((a, b) => a - b)).toEqual([7, 42, 99]);
  });

  it('should create a touch ghost and append it to document.body on touchstart', () => {
    component.isSelected = false;
    component.onTouchStart(createTouchEvent(100, 200, 'touchstart'));
    const ghost = (component as any)._touchGhost as HTMLElement;
    expect(ghost).not.toBeNull();
    expect(document.body.contains(ghost)).toBe(true);
    // cleanup
    ghost.parentNode?.removeChild(ghost);
  });

  it('should position the touch ghost above the finger on touchstart', () => {
    component.isSelected = false;
    component.onTouchStart(createTouchEvent(100, 200, 'touchstart'));
    const ghost = (component as any)._touchGhost as HTMLElement;
    expect(parseFloat(ghost.style.top)).toBeLessThan(200);
    // cleanup
    ghost.parentNode?.removeChild(ghost);
  });

  // ─── onTouchMove ─────────────────────────────────────────────────────────

  it('should do nothing on touchmove when no drag is active', () => {
    mockDragService.draggedBookIds = [];
    const event = createTouchEvent(0, 0, 'touchmove');
    component.onTouchMove(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('should call preventDefault on touchmove when drag is active', () => {
    mockDragService.draggedBookIds = [42];
    const container = document.createElement('div');
    container.classList.add('menu-item-container');
    container.dataset['shelfId'] = '10';
    mockElementFromPoint(container);

    const event = createTouchEvent(100, 100, 'touchmove');
    component.onTouchMove(event);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('should add drag-over class to shelf container under finger during touchmove', () => {
    mockDragService.draggedBookIds = [42];
    const container = document.createElement('div');
    container.classList.add('menu-item-container');
    container.dataset['shelfId'] = '10';
    mockElementFromPoint(container);

    component.onTouchMove(createTouchEvent(100, 100, 'touchmove'));
    expect(container.classList.contains('drag-over')).toBe(true);
  });

  it('should move the touch ghost to follow the finger on touchmove', () => {
    mockDragService.draggedBookIds = [42];
    const ghost = document.createElement('div');
    ghost.style.width = '60px';
    ghost.style.height = '90px';
    ghost.style.position = 'fixed';
    (component as any)._touchGhost = ghost;
    mockElementFromPoint(null);

    component.onTouchMove(createTouchEvent(150, 300, 'touchmove'));
    expect(ghost.style.left).toBe(`${150 - 60 / 2}px`);
    expect(ghost.style.top).toBe(`${300 - 90 - 20}px`);
  });

  // ─── onTouchEnd ──────────────────────────────────────────────────────────

  it('should do nothing on touchend when no drag is active', () => {
    mockDragService.draggedBookIds = [];
    const event = createTouchEvent(0, 0, 'touchend');
    component.onTouchEnd(event);
    expect(mockDragService.dropOnShelf).not.toHaveBeenCalled();
    expect(mockDragService.endDrag).not.toHaveBeenCalled();
  });

  it('should call dropOnShelf when finger lifts over a shelf container', () => {
    mockDragService.draggedBookIds = [42];
    const container = document.createElement('div');
    container.classList.add('menu-item-container');
    container.dataset['shelfId'] = '10';
    container.dataset['shelfLabel'] = 'My Shelf';
    mockElementFromPoint(container);

    component.onTouchEnd(createTouchEvent(100, 100, 'touchend'));
    expect(mockDragService.dropOnShelf).toHaveBeenCalledWith(10, 'My Shelf');
  });

  it('should call endDrag when finger lifts over a non-shelf element', () => {
    mockDragService.draggedBookIds = [42];
    const div = document.createElement('div');
    mockElementFromPoint(div);

    component.onTouchEnd(createTouchEvent(0, 0, 'touchend'));
    expect(mockDragService.dropOnShelf).not.toHaveBeenCalled();
    expect(mockDragService.endDrag).toHaveBeenCalled();
  });

  it('should remove drag-over class from previous target on touchend', () => {
    mockDragService.draggedBookIds = [42];
    const container = document.createElement('div');
    container.classList.add('menu-item-container', 'drag-over');
    container.dataset['shelfId'] = '10';
    container.dataset['shelfLabel'] = 'My Shelf';
    mockElementFromPoint(container);

    // simulate a previous touch-move target
    (component as any)._touchDragTarget = container;

    component.onTouchEnd(createTouchEvent(100, 100, 'touchend'));
    expect(container.classList.contains('drag-over')).toBe(false);
  });

  it('should remove the touch ghost from the DOM on touchend', () => {
    mockDragService.draggedBookIds = [42];
    const ghost = document.createElement('div');
    document.body.appendChild(ghost);
    (component as any)._touchGhost = ghost;
    mockElementFromPoint(null);

    component.onTouchEnd(createTouchEvent(0, 0, 'touchend'));
    expect(document.body.contains(ghost)).toBe(false);
    expect((component as any)._touchGhost).toBeNull();
  });

  it('should remove the touch ghost even when no drag is active on touchend', () => {
    mockDragService.draggedBookIds = [];
    const ghost = document.createElement('div');
    document.body.appendChild(ghost);
    (component as any)._touchGhost = ghost;

    component.onTouchEnd(createTouchEvent(0, 0, 'touchend'));
    expect(document.body.contains(ghost)).toBe(false);
    expect((component as any)._touchGhost).toBeNull();
  });
});

