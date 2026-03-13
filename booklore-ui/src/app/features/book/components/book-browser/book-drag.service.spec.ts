import {beforeEach, describe, expect, it, vi} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {BookDragService} from './book-drag.service';
import {BookPatchService} from '../../service/book-patch.service';
import {ShelfService} from '../../service/shelf.service';
import {MessageService} from 'primeng/api';
import {TranslocoService} from '@jsverse/transloco';
import {of} from 'rxjs';

describe('BookDragService', () => {
  let service: BookDragService;
  let mockBookPatchService: {updateBookShelves: ReturnType<typeof vi.fn>};
  let mockShelfService: {reloadShelves: ReturnType<typeof vi.fn>};
  let mockMessageService: {add: ReturnType<typeof vi.fn>};
  let mockTransloco: {translate: ReturnType<typeof vi.fn>};

  beforeEach(() => {
    mockBookPatchService = {updateBookShelves: vi.fn(() => of([]))};
    mockShelfService = {reloadShelves: vi.fn()};
    mockMessageService = {add: vi.fn()};
    mockTransloco = {translate: vi.fn((key: string) => key)};

    TestBed.configureTestingModule({
      providers: [
        BookDragService,
        {provide: BookPatchService, useValue: mockBookPatchService},
        {provide: ShelfService, useValue: mockShelfService},
        {provide: MessageService, useValue: mockMessageService},
        {provide: TranslocoService, useValue: mockTransloco},
      ]
    });

    service = TestBed.inject(BookDragService);
  });

  it('should start with empty draggedBookIds', () => {
    expect(service.draggedBookIds).toEqual([]);
  });

  it('should store book ids after startDrag', () => {
    service.startDrag([1, 2, 3]);
    expect(service.draggedBookIds).toEqual([1, 2, 3]);
  });

  it('should clear draggedBookIds after endDrag', () => {
    service.startDrag([1, 2]);
    service.endDrag();
    expect(service.draggedBookIds).toEqual([]);
  });

  it('should not call updateBookShelves when draggedBookIds is empty', () => {
    service.dropOnShelf(10, 'My Shelf');
    expect(mockBookPatchService.updateBookShelves).not.toHaveBeenCalled();
  });

  it('should call updateBookShelves with correct arguments', () => {
    service.startDrag([1, 2, 3]);
    service.dropOnShelf(10, 'My Shelf');
    expect(mockBookPatchService.updateBookShelves).toHaveBeenCalledWith(
      new Set([1, 2, 3]),
      new Set([10]),
      new Set()
    );
  });

  it('should reload shelves and show success toast on drop success', () => {
    service.startDrag([5]);
    service.dropOnShelf(10, 'My Shelf');
    expect(mockShelfService.reloadShelves).toHaveBeenCalled();
    expect(mockMessageService.add).toHaveBeenCalledWith(expect.objectContaining({severity: 'success'}));
  });

  it('should show error toast when updateBookShelves errors', () => {
    mockBookPatchService.updateBookShelves.mockReturnValue(
      new (require('rxjs').Observable)((obs: any) => obs.error(new Error('fail')))
    );
    service.startDrag([5]);
    service.dropOnShelf(10, 'My Shelf');
    expect(mockMessageService.add).toHaveBeenCalledWith(expect.objectContaining({severity: 'error'}));
  });

  it('should clear draggedBookIds after dropOnShelf', () => {
    service.startDrag([1, 2]);
    service.dropOnShelf(10, 'My Shelf');
    expect(service.draggedBookIds).toEqual([]);
  });
});
