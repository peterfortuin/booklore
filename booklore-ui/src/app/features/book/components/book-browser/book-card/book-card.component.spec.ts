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
import {of, Subject} from 'rxjs';
import {Book} from '../../../model/book.model';

function createDragEvent(types: string[], getData: (key: string) => string = () => ''): DragEvent {
  const dataMap = new Map<string, string>();
  const dt = {
    types,
    setData: vi.fn((key: string, value: string) => dataMap.set(key.toLowerCase(), value)),
    getData: vi.fn((key: string) => dataMap.get(key.toLowerCase()) ?? ''),
    effectAllowed: 'all',
  } as unknown as DataTransfer;
  return {dataTransfer: dt, preventDefault: vi.fn()} as unknown as DragEvent;
}

describe('BookCardComponent – onDragStart', () => {
  let component: BookCardComponent;
  let bookSelectionService: BookSelectionService;

  const mockBook: Partial<Book> = {
    id: 42,
    metadata: {title: 'Test Book'} as any,
    readStatus: 'UNREAD' as any,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BookSelectionService,
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
      ]
    });

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

  it('should set bookIds with all selected book ids when selection has multiple books', () => {
    bookSelectionService.setSelectedBooks(new Set([42, 7, 99]));
    component.isSelected = true;
    const event = createDragEvent([]);
    component.onDragStart(event);

    const call = (event.dataTransfer!.setData as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe('bookIds');
    const ids: number[] = JSON.parse(call[1]);
    expect(ids.sort((a, b) => a - b)).toEqual([7, 42, 99]);
  });

  it('should set bookIds with only the dragged book id when isSelected is false even if other books are selected', () => {
    bookSelectionService.setSelectedBooks(new Set([42, 7, 99]));
    component.isSelected = false;
    const event = createDragEvent([]);
    component.onDragStart(event);
    expect(event.dataTransfer!.setData).toHaveBeenCalledWith('bookIds', JSON.stringify([42]));
  });
});
